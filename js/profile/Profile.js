const PROFILE_AUTH_SESSION_KEY = "prw.auth.session";
const profileTitle = document.querySelector("#ProfileTitle");
const profileStatus = document.querySelector(".profile-status");
const logOutButton = document.querySelector("#LogOut");
const winsDisplay = document.querySelector("#WinsDisplay");
const lossesDisplay = document.querySelector("#LossDisplay");
const matchesDisplay = document.querySelector("#MatchesDisplay");
const winRateDisplay = document.querySelector("#WinPercentDisplay");
const heroList = document.querySelector("#HeroList");
const topHeroPicture = document.querySelector("#HeroPicture");
const topHeroName = document.querySelector("#TopHeroName");
const topHeroPicks = document.querySelector("#TopHeroPicks");

function readProfileSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(PROFILE_AUTH_SESSION_KEY));
    return session && typeof session.username === "string" ? session : null;
  } catch {
    return null;
  }
}

function renderProfileIdentity() {
  const session = readProfileSession();
  if (profileTitle) profileTitle.textContent = session ? `${session.username}'s Command Profile` : "No Player Identity Connected";
  if (profileStatus) {
    const userCode = session?.id == null ? "PRW-GUEST" : `PRW-${String(session.id).padStart(3, "0")}`;
    const indicator = document.createElement("i");
    const code = document.createElement("span");
    code.textContent = userCode;
    profileStatus.replaceChildren(indicator, ` ${session ? "Online" : "Offline"} `, code);
  }
  if (logOutButton) logOutButton.textContent = session ? "Log Out" : "Return to Sign In";
}

function setTotals({ wins = 0, losses = 0, matches = 0, winRate = 0 } = {}) {
  winsDisplay.textContent = `Wins: ${wins}`;
  lossesDisplay.textContent = `Losses: ${losses}`;
  matchesDisplay.textContent = `Matches Played: ${matches}`;
  winRateDisplay.textContent = `Win Rate: ${Number(winRate).toFixed(1)}%`;
}

function heroFallback(heroId) {
  const name = String(heroId || "Unknown Hero").split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return { id: heroId, name, image: "Img/Characters/MarvelRivals/IronManPNG.png", universe: "unknown" };
}

function renderHeroStats(topHeroes, catalog) {
  if (!topHeroes.length) {
    heroList.innerHTML = '<li class="profile-hero-empty"><span>No completed matches yet</span><small>Deploy a squad to begin tracking</small></li>';
    topHeroName.textContent = "Awaiting first deployment";
    topHeroPicks.textContent = "Times Picked: 0";
    topHeroPicture.alt = "No most-played hero yet";
    topHeroPicture.classList.add("is-empty");
    return;
  }

  heroList.innerHTML = topHeroes.map(({ heroId, timesUsed }) => {
    const hero = catalog.get(heroId) || heroFallback(heroId);
    return `<li data-universe="${hero.universe || "unknown"}"><span>${hero.name}</span><small>${timesUsed} ${timesUsed === 1 ? "deployment" : "deployments"}</small></li>`;
  }).join("");

  const topUsage = topHeroes[0];
  const hero = catalog.get(topUsage.heroId) || heroFallback(topUsage.heroId);
  topHeroPicture.src = hero.image;
  topHeroPicture.alt = `${hero.name}, most played hero`;
  topHeroPicture.classList.remove("is-empty");
  topHeroName.textContent = hero.name;
  topHeroPicks.textContent = `Times Picked: ${topUsage.timesUsed}`;
}

function renderTrackingMessage(message) {
  setTotals();
  heroList.innerHTML = `<li class="profile-hero-empty"><span>${message}</span><small>Career telemetry unavailable</small></li>`;
  topHeroName.textContent = "No tracking data";
  topHeroPicks.textContent = "Times Picked: 0";
  topHeroPicture.classList.add("is-empty");
}

async function loadProfileStats() {
  const session = readProfileSession();
  if (!session) return renderTrackingMessage("Sign in to track your career");
  if (!session.token) return renderTrackingMessage("Log out and sign in again once");

  heroList.innerHTML = '<li class="profile-hero-empty is-loading"><span>Loading combat history…</span><small>Synchronizing account record</small></li>';
  try {
    const [statsResult, catalogResponse] = await Promise.all([
      window.PRWProfileStats.getStats(),
      fetch("data/online-heroes.json", { cache: "no-store" }),
    ]);
    if (statsResult.skipped) throw new Error("Sign in to track your career.");
    if (!catalogResponse.ok) throw new Error("Hero catalog is unavailable.");
    const catalogData = await catalogResponse.json();
    const catalog = new Map((catalogData.heroes || []).map((hero) => [hero.id, hero]));
    setTotals(statsResult.stats);
    renderHeroStats(statsResult.stats.topHeroes || [], catalog);
  } catch (error) {
    renderTrackingMessage(error.message || "Profile tracking is unavailable");
  }
}

logOutButton?.addEventListener("click", () => {
  window.localStorage.removeItem(PROFILE_AUTH_SESSION_KEY);
  window.location.href = "Main.html";
});

renderProfileIdentity();
loadProfileStats();
