"use strict";

const { verifySessionToken } = require("../AuthSession");
const store = require("../ProfileStatsStore");

const VALID_MODES = new Set(["standard", "online", "ability-draft", "leader-protocol", "hero-chess"]);
const VALID_OUTCOMES = new Set(["win", "loss", "draw"]);

function bodyOf(request) {
    if (request.body && typeof request.body === "object") return request.body;
    try { return JSON.parse(request.body || "{}"); } catch { return {}; }
}

function send(response, status, payload) {
    return response.status(status).json(payload);
}

module.exports = async (request, response) => {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return send(response, 405, { error: "Method not allowed." });
    }

    const body = bodyOf(request);
    let session;
    try {
        session = verifySessionToken(body.token);
    } catch (error) {
        if (error?.code === "AUTH_SESSION_SECRET_MISSING") {
            return send(response, 503, { error: "Profile tracking is not configured on this server." });
        }
        throw error;
    }
    if (!session) return send(response, 401, { error: "Your account session expired. Log in again to continue tracking stats." });

    try {
        if (body.action === "get") {
            return send(response, 200, { stats: await store.getStats(session.sub) });
        }

        if (body.action !== "record") return send(response, 400, { error: "Unknown profile stats action." });
        const matchKey = typeof body.matchKey === "string" ? body.matchKey.trim() : "";
        const mode = typeof body.mode === "string" ? body.mode : "";
        const outcome = typeof body.outcome === "string" ? body.outcome : "";
        const heroes = Array.isArray(body.heroes)
            ? body.heroes.map((value) => String(value || "").trim().toLowerCase()).filter((id) => /^[a-z0-9-]{1,64}$/.test(id)).slice(0, 16)
            : [];

        if (!/^[a-z0-9:_-]{8,128}$/i.test(matchKey)) return send(response, 400, { error: "Invalid match identifier." });
        if (!VALID_MODES.has(mode)) return send(response, 400, { error: "Invalid game mode." });
        if (!VALID_OUTCOMES.has(outcome)) return send(response, 400, { error: "Invalid match outcome." });

        const recorded = await store.recordMatch({ userKey: session.sub, matchKey, mode, outcome, heroes });
        return send(response, 200, { recorded });
    } catch (error) {
        console.error("Profile stats API failed.", error);
        if (error?.code === "DATABASE_CONFIG_MISSING") {
            return send(response, 503, { error: "The profile database is not configured." });
        }
        return send(response, 503, { error: "Profile tracking is temporarily unavailable." });
    }
};
