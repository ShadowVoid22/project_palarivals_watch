(function profileStatsModule() {
  "use strict";

  const SESSION_KEY = "prw.auth.session";

  function session() {
    try { return JSON.parse(window.localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }

  function createMatchId(mode) {
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${mode}:${id}`;
  }

  async function request(payload) {
    const account = session();
    if (!account?.token) return { skipped: true, reason: "signed-out" };
    const response = await fetch("/api/profile-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, token: account.token }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Profile tracking failed.");
    return data;
  }

  async function recordMatch({ matchKey, mode, outcome, heroes = [] }) {
    try {
      return await request({ action: "record", matchKey, mode, outcome, heroes: heroes.filter(Boolean) });
    } catch (error) {
      console.warn("Match stats were not recorded:", error.message);
      return { skipped: true, reason: "request-failed" };
    }
  }

  window.PRWProfileStats = { createMatchId, getStats: () => request({ action: "get" }), recordMatch };
})();
