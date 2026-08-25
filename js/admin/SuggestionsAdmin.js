const adminLock = document.querySelector("#AdminLock");
const adminDashboard = document.querySelector("#AdminDashboard");
const adminKeyForm = document.querySelector("#AdminKeyForm");
const adminKeyInput = document.querySelector("#AdminKey");
const adminKeyToggle = document.querySelector("#AdminKeyToggle");
const adminUnlock = document.querySelector("#AdminUnlock");
const adminLoginMessage = document.querySelector("#AdminLoginMessage");
const suggestionList = document.querySelector("#SuggestionList");
const suggestionTemplate = document.querySelector("#SuggestionCardTemplate");
const suggestionSearch = document.querySelector("#SuggestionSearch");
const suggestionFilter = document.querySelector("#SuggestionFilter");
const visibleSuggestions = document.querySelector("#VisibleSuggestions");
const totalSuggestions = document.querySelector("#TotalSuggestions");
const featureSuggestions = document.querySelector("#FeatureSuggestions");
const balanceSuggestions = document.querySelector("#BalanceSuggestions");
const latestSuggestion = document.querySelector("#LatestSuggestion");
const refreshSuggestions = document.querySelector("#RefreshSuggestions");
const exportSuggestions = document.querySelector("#ExportSuggestions");
const lockAdmin = document.querySelector("#LockAdmin");
const adminNotice = document.querySelector("#AdminNotice");
const adminEmpty = document.querySelector("#AdminEmpty");
const adminEmptyMessage = document.querySelector("#AdminEmptyMessage");
const deleteDialog = document.querySelector("#DeleteDialog");
const deleteSuggestionName = document.querySelector("#DeleteSuggestionName");
const deleteBackdrop = document.querySelector("#DeleteBackdrop");
const cancelDelete = document.querySelector("#CancelDelete");
const confirmDelete = document.querySelector("#ConfirmDelete");

const CATEGORY_LABELS = {
  feature: "New Feature",
  balance: "Balance Change",
  hero: "Hero / Ability",
  interface: "Interface",
  "game-mode": "Game Mode",
  bug: "Bug Report",
  other: "Other Idea"
};
const REQUEST_TIMEOUT_MS = 12_000;

let adminKey = "";
let suggestions = [];
let pendingDeleteId = null;
let noticeTimer = null;

function setBusy(button, busy, busyText, readyText) {
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  const label = button.querySelector("span:not([aria-hidden])") || button;
  if (label === button) button.textContent = busy ? busyText : readyText;
  else label.textContent = busy ? busyText : readyText;
}

async function requestSuggestions(method = "GET", id = "") {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = id ? `/api/suggestions?id=${encodeURIComponent(id)}` : "/api/suggestions";
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${adminKey}` },
      signal: controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || "The suggestion archive did not respond.");
      error.status = response.status;
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The suggestion archive took too long to respond.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatLatest(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--";
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function showNotice(message, state = "success") {
  window.clearTimeout(noticeTimer);
  adminNotice.textContent = message;
  adminNotice.dataset.state = state;
  adminNotice.hidden = false;
  noticeTimer = window.setTimeout(() => {
    adminNotice.hidden = true;
  }, 4500);
}

function updateStats() {
  totalSuggestions.textContent = suggestions.length;
  featureSuggestions.textContent = suggestions.filter((item) => ["feature", "game-mode"].includes(item.category)).length;
  balanceSuggestions.textContent = suggestions.filter((item) => ["balance", "hero", "bug"].includes(item.category)).length;
  latestSuggestion.textContent = suggestions.length ? formatLatest(suggestions[0].submittedAt) : "--";
}

function createSuggestionCard(suggestion, index) {
  const card = suggestionTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.category = suggestion.category || "other";
  card.querySelector(".suggestion-card__category").textContent = CATEGORY_LABELS[suggestion.category] || "Other Idea";
  card.querySelector("time").dateTime = suggestion.submittedAt || "";
  card.querySelector("time").textContent = formatDate(suggestion.submittedAt);
  card.querySelector(".suggestion-card__index").textContent = String(index + 1).padStart(2, "0");
  card.querySelector("h2").textContent = suggestion.title || "Untitled Suggestion";
  card.querySelector(".suggestion-card__content > p").textContent = suggestion.details || "No details supplied.";
  card.querySelector(".suggestion-card__player").textContent = `From // ${suggestion.playerName || "Anonymous Commander"}`;
  const theme = suggestion.context?.theme || "default";
  const mode = suggestion.context?.colorMode || "dark";
  card.querySelector(".suggestion-card__context").textContent = `${theme} // ${mode}`;
  card.querySelector(".suggestion-card__id").textContent = `ID ${String(suggestion.id || "unknown").slice(0, 8)}`;
  const deleteButton = card.querySelector(".suggestion-card__delete");
  deleteButton.dataset.suggestionId = suggestion.id;
  deleteButton.setAttribute("aria-label", `Delete suggestion: ${suggestion.title || "Untitled Suggestion"}`);
  return card;
}

function renderSuggestions() {
  const query = suggestionSearch.value.trim().toLowerCase();
  const category = suggestionFilter.value;
  const filtered = suggestions.filter((suggestion) => {
    if (category !== "all" && suggestion.category !== category) return false;
    const searchable = `${suggestion.title || ""} ${suggestion.details || ""} ${suggestion.playerName || ""}`.toLowerCase();
    return !query || searchable.includes(query);
  });

  suggestionList.replaceChildren(...filtered.map(createSuggestionCard));
  visibleSuggestions.textContent = filtered.length;
  adminEmpty.hidden = filtered.length > 0;
  suggestionList.hidden = filtered.length === 0;
  adminEmptyMessage.textContent = suggestions.length
    ? "No transmissions match the current search and channel filter."
    : "There are no suggestions waiting for review.";
  updateStats();
}

async function loadSuggestions({ unlock = false } = {}) {
  if (unlock) {
    setBusy(adminUnlock, true, "Opening Channel...", "Open Suggestion Inbox");
    adminLoginMessage.hidden = true;
  } else {
    refreshSuggestions.disabled = true;
    refreshSuggestions.classList.add("is-busy");
  }

  try {
    const data = await requestSuggestions();
    suggestions = [...(data.suggestions || [])].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    if (unlock) {
      adminLock.hidden = true;
      adminDashboard.hidden = false;
      document.body.classList.add("is-unlocked");
    }
    renderSuggestions();
    if (!unlock) showNotice("Suggestion archive refreshed.");
  } catch (error) {
    if (unlock) {
      adminLoginMessage.textContent = error.status === 401 ? "That admin key was rejected." : error.message;
      adminLoginMessage.dataset.state = "error";
      adminLoginMessage.hidden = false;
      adminKeyInput.focus();
      adminKeyInput.select();
    } else {
      showNotice(error.message, "error");
    }
  } finally {
    if (unlock) setBusy(adminUnlock, false, "Opening Channel...", "Open Suggestion Inbox");
    else {
      refreshSuggestions.disabled = false;
      refreshSuggestions.classList.remove("is-busy");
    }
  }
}

function openDeleteDialog(id) {
  const suggestion = suggestions.find((item) => item.id === id);
  if (!suggestion) return;
  pendingDeleteId = id;
  deleteSuggestionName.textContent = suggestion.title || "this suggestion";
  deleteDialog.hidden = false;
  deleteDialog.setAttribute("aria-hidden", "false");
  document.body.classList.add("delete-dialog-open");
  window.setTimeout(() => cancelDelete.focus(), 20);
}

function closeDeleteDialog({ restoreFocus = true } = {}) {
  if (deleteDialog.hidden) return;
  const deletedId = pendingDeleteId;
  pendingDeleteId = null;
  deleteDialog.hidden = true;
  deleteDialog.setAttribute("aria-hidden", "true");
  document.body.classList.remove("delete-dialog-open");
  if (restoreFocus && deletedId) document.querySelector(`[data-suggestion-id="${CSS.escape(deletedId)}"]`)?.focus();
}

async function deleteSuggestion() {
  if (!pendingDeleteId) return;
  const suggestionId = pendingDeleteId;
  const suggestion = suggestions.find((item) => item.id === suggestionId);
  confirmDelete.disabled = true;
  confirmDelete.textContent = "Deleting...";
  try {
    await requestSuggestions("DELETE", suggestionId);
    suggestions = suggestions.filter((item) => item.id !== suggestionId);
    closeDeleteDialog({ restoreFocus: false });
    renderSuggestions();
    showNotice(`Deleted “${suggestion?.title || "suggestion"}” from the shared archive.`);
  } catch (error) {
    closeDeleteDialog({ restoreFocus: true });
    showNotice(error.message, "error");
  } finally {
    confirmDelete.disabled = false;
    confirmDelete.textContent = "Delete Permanently";
  }
}

function lockConsole() {
  adminKey = "";
  suggestions = [];
  pendingDeleteId = null;
  adminKeyForm.reset();
  adminDashboard.hidden = true;
  adminLock.hidden = false;
  document.body.classList.remove("is-unlocked");
  suggestionList.replaceChildren();
  adminKeyInput.focus();
}

function exportArchive() {
  const file = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), suggestions }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `palarivals-suggestions-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showNotice("A JSON copy of the visible archive was exported.");
}

adminKeyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  adminKey = adminKeyInput.value;
  loadSuggestions({ unlock: true });
});

adminKeyToggle.addEventListener("click", () => {
  const show = adminKeyInput.type === "password";
  adminKeyInput.type = show ? "text" : "password";
  adminKeyToggle.textContent = show ? "Hide" : "Show";
  adminKeyToggle.setAttribute("aria-label", show ? "Hide admin key" : "Show admin key");
  adminKeyToggle.setAttribute("aria-pressed", String(show));
});

suggestionSearch.addEventListener("input", renderSuggestions);
suggestionFilter.addEventListener("change", renderSuggestions);
refreshSuggestions.addEventListener("click", () => loadSuggestions());
exportSuggestions.addEventListener("click", exportArchive);
lockAdmin.addEventListener("click", lockConsole);
suggestionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-suggestion-id]");
  if (button) openDeleteDialog(button.dataset.suggestionId);
});
deleteBackdrop.addEventListener("click", closeDeleteDialog);
cancelDelete.addEventListener("click", closeDeleteDialog);
confirmDelete.addEventListener("click", deleteSuggestion);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDeleteDialog();
});
