import { BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const STORE_PATH = "community/suggestions.json";
const MAX_SUGGESTIONS = 1000;
const MAX_REQUEST_BYTES = 20_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 6;
const BLOB_OPERATION_TIMEOUT_MS = 5_000;
const VALID_CATEGORIES = new Set(["feature", "balance", "hero", "interface", "game-mode", "bug", "other"]);
const requestLog = new Map();

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clientAddress(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(request) {
  const address = clientAddress(request);
  const now = Date.now();
  const recent = (requestLog.get(address) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  recent.push(now);
  requestLog.set(address, recent);
  return recent.length > RATE_LIMIT;
}

function blobOptions(request) {
  const oidcToken = request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  return {
    access: "private",
    abortSignal: AbortSignal.timeout(BLOB_OPERATION_TIMEOUT_MS),
    ...(oidcToken && storeId ? { oidcToken, storeId } : {})
  };
}

function hasBlobCredentials(request) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  const hasOidcToken = request.headers.has("x-vercel-oidc-token") || Boolean(process.env.VERCEL_OIDC_TOKEN);
  return hasOidcToken && Boolean(process.env.BLOB_STORE_ID);
}

async function readSuggestionStore(request) {
  const result = await get(STORE_PATH, { ...blobOptions(request), useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return { etag: null, value: { schemaVersion: 1, updatedAt: null, suggestions: [] } };
  }
  const value = await new Response(result.stream).json();
  if (!value || !Array.isArray(value.suggestions)) throw new Error("Suggestion store has an invalid JSON shape.");
  const metadata = await head(STORE_PATH, blobOptions(request));
  return { etag: metadata.etag, value };
}

function isWriteConflict(error) {
  return error instanceof BlobPreconditionFailedError || ["BlobPreconditionFailedError", "BlobConflictError"].includes(error?.name);
}

async function appendSuggestion(request, suggestion) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { etag, value } = await readSuggestionStore(request);
    if (value.suggestions.some((entry) => entry.clientSubmissionId === suggestion.clientSubmissionId)) return suggestion;
    const nextValue = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      suggestions: [...value.suggestions, suggestion].slice(-MAX_SUGGESTIONS)
    };
    try {
      await put(STORE_PATH, JSON.stringify(nextValue, null, 2), {
        ...blobOptions(request),
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 60,
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : {})
      });
      return suggestion;
    } catch (error) {
      if (!isWriteConflict(error) || attempt === 3) throw error;
    }
  }
  throw new Error("Unable to update the suggestion store.");
}

function adminAccessError(request) {
  const adminKey = process.env.SUGGESTIONS_ADMIN_KEY;
  if (!adminKey) return json({ error: "Suggestion administration is not configured." }, 503);
  if (request.headers.get("authorization") !== `Bearer ${adminKey}`) return json({ error: "Unauthorized." }, 401);
  if (!hasBlobCredentials(request)) return json({ error: "Shared suggestion storage is not connected yet.", code: "STORAGE_NOT_CONFIGURED" }, 503);
  return null;
}

async function handleAdminDownload(request) {
  const accessError = adminAccessError(request);
  if (accessError) return accessError;
  const { value } = await readSuggestionStore(request);
  return json(value);
}

async function handleAdminDelete(request) {
  const accessError = adminAccessError(request);
  if (accessError) return accessError;
  const suggestionId = cleanText(new URL(request.url).searchParams.get("id"), 100);
  if (!suggestionId) return json({ error: "A suggestion id is required." }, 400);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { etag, value } = await readSuggestionStore(request);
    const suggestion = value.suggestions.find((entry) => entry.id === suggestionId);
    if (!suggestion) return json({ error: "Suggestion not found." }, 404);

    const nextValue = {
      ...value,
      updatedAt: new Date().toISOString(),
      suggestions: value.suggestions.filter((entry) => entry.id !== suggestionId)
    };

    try {
      await put(STORE_PATH, JSON.stringify(nextValue, null, 2), {
        ...blobOptions(request),
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 60,
        allowOverwrite: true,
        ...(etag ? { ifMatch: etag } : {})
      });
      return json({ deleted: true, id: suggestionId, remaining: nextValue.suggestions.length });
    } catch (error) {
      if (!isWriteConflict(error) || attempt === 3) throw error;
    }
  }

  throw new Error("Unable to delete the suggestion.");
}

async function handleSubmission(request) {
  if (!hasBlobCredentials(request)) return json({ error: "Shared suggestion storage is not connected yet.", code: "STORAGE_NOT_CONFIGURED" }, 503);
  if (isRateLimited(request)) return json({ error: "Too many suggestions were sent from this connection. Please wait a minute." }, 429);
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) return json({ error: "Suggestion payload is too large." }, 413);

  let body;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BYTES) return json({ error: "Suggestion payload is too large." }, 413);
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Suggestion must be valid JSON." }, 400);
  }

  if (cleanText(body.website, 200)) return json({ accepted: true }, 201);
  const category = cleanText(body.category, 30);
  const title = cleanText(body.title, 80);
  const details = cleanText(body.details, 1200);
  const playerName = cleanText(body.playerName, 30) || "Anonymous Commander";
  if (!VALID_CATEGORIES.has(category)) return json({ error: "Choose a valid suggestion type." }, 400);
  if (title.length < 3) return json({ error: "The idea title must be at least 3 characters." }, 400);
  if (details.length < 20) return json({ error: "Please explain the idea in at least 20 characters." }, 400);

  const suggestion = {
    id: randomUUID(),
    clientSubmissionId: cleanText(body.clientSubmissionId, 80) || randomUUID(),
    status: "new",
    category,
    title,
    details,
    playerName,
    context: {
      page: "main-menu",
      theme: cleanText(body.context?.theme, 20) || "default",
      colorMode: cleanText(body.context?.colorMode, 10) || "dark"
    },
    submittedAt: new Date().toISOString()
  };

  await appendSuggestion(request, suggestion);
  return json({ accepted: true, id: suggestion.id }, 201);
}

async function handleRequest(request) {
  try {
    if (request.method === "GET") return await handleAdminDownload(request);
    if (request.method === "POST") return await handleSubmission(request);
    if (request.method === "DELETE") return await handleAdminDelete(request);
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("Suggestion API failed.", error);
    return json({ error: "The suggestion could not be stored. Please try again later." }, 500);
  }
}

export default {
  fetch: handleRequest
};
