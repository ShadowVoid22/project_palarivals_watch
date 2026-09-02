"use strict";

const API_URL = "/api/online";
const SESSION_KEY = "prw.online.session";
const AUTH_SESSION_KEY = "prw.auth.session";
const POLL_INTERVAL_MS = 850;
const ACTION_TIMEOUT_MS = 12_000;
const UPGRADE_COSTS = { 1: 4, 2: 6, 3: 8 };

const matchmakingScreen = document.querySelector("#matchmakingScreen");
const joinButton = document.querySelector("#joinOnlineButton");
const queueProgress = document.querySelector("#queueProgress");
const queueCount = document.querySelector("#queueCount");
const queueSeats = document.querySelector("#queueSeats");
const queueError = document.querySelector("#queueError");
const fillWithAiButton = document.querySelector("#fillWithAiButton");
const onlineGame = document.querySelector("#onlineGame");
const connectionState = document.querySelector("#connectionState");
const healthElement = document.querySelector("#onlineHealth");
const roundElement = document.querySelector("#onlineRound");
const timerElement = document.querySelector("#onlineTimer");
const phaseLabel = document.querySelector("#onlinePhaseLabel");
const creditsElement = document.querySelector("#onlineCredits");
const commanderName = document.querySelector("#commanderName");
const unitCount = document.querySelector("#onlineUnitCount");
const readyButton = document.querySelector("#onlineReadyButton");
const mergeButton = document.querySelector("#onlineMergeButton");
const mergeHint = document.querySelector("#onlineMergeHint");
const traitsElement = document.querySelector("#onlineTraits");
const teamElement = document.querySelector("#onlineTeam");
const benchElement = document.querySelector("#onlineBench");
const shopCards = document.querySelector("#onlineShopCards");
const shopTier = document.querySelector("#onlineShopTier");
const upgradeButton = document.querySelector("#onlineUpgradeButton");
const upgradeCost = document.querySelector("#onlineUpgradeCost");
const upgradeHint = document.querySelector("#onlineUpgradeHint");
const rerollButton = document.querySelector("#onlineRerollButton");
const freezeButton = document.querySelector("#onlineFreezeButton");
const playerList = document.querySelector("#onlinePlayerList");
const humanCount = document.querySelector("#humanCount");
const matchCode = document.querySelector("#matchCode");
const formationField = document.querySelector("#formationField");
const combatElement = document.querySelector("#onlineCombat");
const combatTitle = document.querySelector("#combatMatchTitle");
const combatResultBadge = document.querySelector("#combatResultBadge");
const combatFirstName = document.querySelector("#combatFirstName");
const combatSecondName = document.querySelector("#combatSecondName");
const combatFirstTeam = document.querySelector("#combatFirstTeam");
const combatSecondTeam = document.querySelector("#combatSecondTeam");
const combatArena = document.querySelector("#onlineCombatArena");
const combatFx = document.querySelector("#onlineCombatFx");
const combatEventCounter = document.querySelector("#combatEventCounter");
const combatEventProgress = document.querySelector("#combatEventProgress");
const combatFirstRemaining = document.querySelector("#combatFirstRemaining");
const combatSecondRemaining = document.querySelector("#combatSecondRemaining");
const combatRoundLabel = document.querySelector("#combatRoundLabel");
const combatFeed = document.querySelector("#onlineCombatFeed");
const combatTimeline = document.querySelector("#onlineCombatTimeline");
const matchCompleteElement = document.querySelector("#onlineMatchComplete");
const completeTitle = document.querySelector("#onlineCompleteTitle");
const completeMessage = document.querySelector("#onlineCompleteMessage");
const playAgainButton = document.querySelector("#onlinePlayAgainButton");
const toastElement = document.querySelector("#onlineToast");
const heroInfo = document.querySelector("#onlineHeroInfo");

let session = null;
let currentState = null;
const profileRecordedMatches = new Set();
let serverClockOffset = 0;
let pollTimer = null;
let clockTimer = null;
let requestInFlight = false;
let selectedSlot = null;
let playedCombatId = null;
let combatTimers = [];
let toastTimer = null;
let traitDefinitions = {};
let heroCatalog = new Map();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function readJsonStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function getDisplayName() {
  const auth = readJsonStorage(AUTH_SESSION_KEY);
  if (auth?.username) return String(auth.username).slice(0, 24);
  let guest = localStorage.getItem("prw.online.guest-name");
  if (!guest) {
    guest = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem("prw.online.guest-name", guest);
  }
  return guest;
}

function saveSession(value) {
  session = value;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

function restoreSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (value?.matchId && value?.playerId && value?.playerToken) session = value;
  } catch {
    session = null;
  }
}

function clearSession() {
  session = null;
  playedCombatId = null;
  sessionStorage.removeItem(SESSION_KEY);
}

function setConnection(label, live = false) {
  connectionState.classList.toggle("is-live", live);
  connectionState.querySelector("strong").textContent = label;
}

function showToast(message, error = false) {
  window.clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.toggle("is-error", error);
  toastElement.hidden = false;
  toastTimer = window.setTimeout(() => { toastElement.hidden = true; }, 3600);
}

async function apiRequest(action, payload = null, includeSession = true) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
  const body = { action };
  if (payload !== null) body.payload = payload;
  if (includeSession && session) Object.assign(body, session);
  if (action === "join") body.displayName = getDisplayName();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Online service returned ${response.status}.`);
      error.code = data.code;
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadReferenceData() {
  const [heroesResponse, traitsResponse] = await Promise.all([
    fetch("data/online-heroes.json", { cache: "no-store" }),
    fetch("data/hero-traits.json", { cache: "no-store" }),
  ]);
  const heroes = heroesResponse.ok ? await heroesResponse.json() : { heroes: [] };
  const traits = traitsResponse.ok ? await traitsResponse.json() : { traits: {} };
  heroCatalog = new Map((heroes.heroes || []).map((hero) => [hero.id, hero]));
  traitDefinitions = traits.traits || {};
}

function phaseSeconds() {
  if (!currentState?.phaseEndsAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(currentState.phaseEndsAt) - (Date.now() + serverClockOffset)) / 1000));
}

function updateClock() {
  if (!currentState) {
    phaseLabel.textContent = "Matchmaking";
    timerElement.textContent = "00:12";
    return;
  }
  const seconds = phaseSeconds();
  timerElement.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  if (currentState?.phase === "waiting") phaseLabel.textContent = "Matchmaking";
  else if (currentState?.phase === "build") phaseLabel.textContent = "Build Time";
  else if (currentState?.phase === "combat") phaseLabel.textContent = "Combat Feed";
  else phaseLabel.textContent = "Operation End";
}

function renderQueue(state) {
  matchmakingScreen.hidden = false;
  onlineGame.hidden = true;
  joinButton.hidden = true;
  queueProgress.hidden = false;
  queueError.hidden = true;
  queueCount.textContent = `${state.players.length} / 8`;
  queueSeats.innerHTML = Array.from({ length: 8 }, (_, index) => {
    const player = state.players[index];
    return `<li class="${player ? "is-filled" : ""}">${player ? escapeHtml(player.name.slice(0, 2).toUpperCase()) : String(index + 1).padStart(2, "0")}</li>`;
  }).join("");
  fillWithAiButton.disabled = state.players.length >= 8;
  setConnection(`${state.players.length}/8 linked`, true);
}

function initials(name) {
  return String(name).split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function universeColor(universe) {
  if (universe === "marvel") return "#50dbff";
  if (universe === "overwatch") return "#ff9e38";
  return "#a77cff";
}

function heroPower(hero) {
  const multiplier = [1, 1.5, 2.25, 3.25][Math.max(0, (hero.level || 1) - 1)];
  return Math.round(hero.power * multiplier);
}

function heroHealth(hero) {
  const multiplier = [1, 1.5, 2.25, 3.25][Math.max(0, (hero.level || 1) - 1)];
  return Math.round(hero.health * multiplier);
}

function heroUnitMarkup(hero, zone, index) {
  if (!hero) return `<span class="roster-slot__empty"><i>+</i>Drop hero</span>`;
  return `
    <article class="hero-unit" draggable="true" data-hero-info="${escapeHtml(hero.id)}" data-source-zone="${zone}" data-source-index="${index}" tabindex="0">
      <img src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.name)}">
      <span class="hero-unit__top"><b>LV ${hero.level}</b><i>${escapeHtml(hero.universe)}</i></span>
      <strong class="hero-unit__name">${escapeHtml(hero.name)}</strong>
      <span class="hero-unit__stats"><span>◆ ${heroPower(hero)}</span><span>♥ ${heroHealth(hero)}</span></span>
      <button class="hero-unit__sell" type="button" data-sell-zone="${zone}" data-sell-index="${index}" aria-label="Sell ${escapeHtml(hero.name)}">$</button>
    </article>`;
}

function renderRoster(container, heroes, zone) {
  container.innerHTML = Array.from({ length: 6 }, (_, index) => {
    const selected = selectedSlot?.zone === zone && selectedSlot?.index === index;
    return `<article class="roster-slot${selected ? " is-selected" : ""}" data-zone="${zone}" data-index="${index}" data-number="${String(index + 1).padStart(2, "0")}">${heroUnitMarkup(heroes[index], zone, index)}</article>`;
  }).join("");
}

function countTraits(team) {
  const counts = new Map();
  team.filter(Boolean).forEach((hero) => {
    (hero.traits || []).forEach((trait) => {
      if (!counts.has(trait)) counts.set(trait, new Set());
      counts.get(trait).add(hero.id);
    });
  });
  return new Map([...counts].map(([trait, ids]) => [trait, ids.size]));
}

function renderTraits(team) {
  const counts = countTraits(team);
  if (!counts.size) {
    traitsElement.innerHTML = "<p>Deploy heroes to activate team traits.</p>";
    return;
  }
  traitsElement.innerHTML = [...counts].map(([traitId, count]) => {
    const definition = traitDefinitions[traitId];
    const reached = (definition?.tiers || []).filter((tier) => count >= tier.threshold).at(-1);
    const color = definition?.category === "world" ? "#52dbff" : (definition?.category === "playstyle" ? "#a77cff" : "#4ff0ad");
    return `<span class="trait-chip${reached ? " is-active" : ""}" style="--trait-color:${color}"><b>${escapeHtml(definition?.name || traitId)}</b><i>${count}</i><small>${reached ? escapeHtml(reached.text) : "Activates at 2"}</small></span>`;
  }).join("");
}

function renderShop(me, locked) {
  shopTier.textContent = String(me.shopTier).padStart(2, "0");
  shopCards.innerHTML = me.shop.map((hero, index) => {
    if (!hero) return `<article class="shop-offer is-empty">Offer purchased</article>`;
    return `
      <article class="shop-offer" style="--offer-color:${universeColor(hero.universe)}" data-hero-info="${escapeHtml(hero.id)}">
        <img src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.name)}">
        <span class="shop-offer__meta"><span><small>${escapeHtml(hero.universe)}</small><strong>${escapeHtml(hero.name)}</strong></span><b>◆ ${hero.power} · ♥ ${hero.health}</b></span>
        <button type="button" data-buy-index="${index}" ${locked || me.credits < hero.cost ? "disabled" : ""}><span>Recruit</span><b>◆ ${hero.cost}</b></button>
      </article>`;
  }).join("");
  const cost = UPGRADE_COSTS[me.shopTier];
  upgradeCost.textContent = cost ? `◆ ${cost}` : "MAX";
  upgradeHint.textContent = cost ? "Unlock stronger heroes" : "Maximum armory tier";
  upgradeButton.disabled = locked || !cost || me.credits < cost;
  rerollButton.disabled = locked || me.credits < 1;
  freezeButton.disabled = locked;
  freezeButton.classList.toggle("is-active", me.frozen);
  freezeButton.setAttribute("aria-pressed", String(me.frozen));
}

function renderLeaderboard(state) {
  const sorted = [...state.players].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.hp - a.hp || a.seat - b.seat);
  humanCount.textContent = state.players.filter((player) => player.wasHuman && !player.isAI).length;
  playerList.innerHTML = sorted.map((player, index) => `
    <li class="online-player${player.id === state.me.id ? " is-me" : ""}${player.ready ? " is-ready" : ""}${player.eliminated ? " is-eliminated" : ""}">
      <span class="online-player__rank">${String(index + 1).padStart(2, "0")}</span>
      <span class="online-player__avatar">${escapeHtml(initials(player.name))}</span>
      <span class="online-player__data"><strong>${escapeHtml(player.name)}${player.isAI ? " · AI" : ""}</strong><small>${escapeHtml(player.status)}</small><i style="--hp:${player.hp}%"></i></span>
      <b>${player.hp}</b>
    </li>`).join("");
}

function combatFighterMarkup(fighter) {
  const hero = heroCatalog.get(fighter.id) || fighter;
  const ability = fighter.abilityName || hero.ability?.name || "Standard Attack";
  return `
    <figure class="combat-fighter" data-combat-index="${fighter.index}" data-hero-info="${escapeHtml(fighter.id)}" style="--unit-delay:${fighter.index * 70}ms">
      <span class="combat-fighter__portrait"><img src="${escapeHtml(hero.image || "")}" alt="${escapeHtml(fighter.name)}"><i></i></span>
      <span class="combat-fighter__level">LV ${fighter.level}</span>
      <span class="combat-fighter__reticle"><i></i></span>
      <span class="combat-fighter__health" aria-label="${fighter.maxHealth} health"><i style="width:100%"></i><b>${fighter.maxHealth} / ${fighter.maxHealth}</b></span>
      <span class="combat-fighter__charge"><i></i></span>
      <figcaption><strong>${escapeHtml(fighter.name)}</strong><em>${escapeHtml(ability)}</em><small>✦ ${fighter.power} · ♥ ${fighter.maxHealth}</small></figcaption>
    </figure>`;
}

function clearCombatTimers() {
  combatTimers.forEach(window.clearTimeout);
  combatTimers = [];
}

function combatUnit(side, index) {
  const team = side === "first" ? combatFirstTeam : combatSecondTeam;
  return team.querySelector(`[data-combat-index="${index}"]`);
}

function combatPoint(unit) {
  const arenaRect = combatArena.getBoundingClientRect();
  const unitRect = unit?.getBoundingClientRect();
  return unitRect ? {
    x: unitRect.left - arenaRect.left + unitRect.width / 2,
    y: unitRect.top - arenaRect.top + unitRect.height * 0.42,
  } : { x: arenaRect.width / 2, y: arenaRect.height / 2 };
}

function removeCombatFx(element, delay = 900) {
  combatTimers.push(window.setTimeout(() => element.remove(), delay));
}

function floatingCombatText(unit, text, variant = "damage") {
  if (!unit) return;
  const point = combatPoint(unit);
  const element = document.createElement("span");
  element.className = `online-combat-float online-combat-float--${variant}`;
  element.textContent = text;
  element.style.left = `${point.x}px`;
  element.style.top = `${point.y}px`;
  combatFx.append(element);
  removeCombatFx(element);
}

function launchCombatProjectile(attacker, defender, event) {
  if (!attacker || !defender) return;
  const origin = combatPoint(attacker);
  const target = combatPoint(defender);
  const travelX = target.x - origin.x;
  const travelY = target.y - origin.y;
  const angle = Math.atan2(travelY, travelX) * (180 / Math.PI);
  const variant = event.critical ? "critical" : (event.abilityName && event.abilityName !== "Standard Attack" ? "ability" : "standard");
  const projectile = document.createElement("i");
  projectile.className = `online-combat-projectile online-combat-projectile--${variant}`;
  projectile.style.left = `${origin.x}px`;
  projectile.style.top = `${origin.y}px`;
  projectile.style.setProperty("--travel-x", `${travelX}px`);
  projectile.style.setProperty("--travel-y", `${travelY}px`);
  projectile.style.setProperty("--projectile-angle", `${angle}deg`);
  const impact = document.createElement("i");
  impact.className = `online-combat-impact online-combat-impact--${event.dodged ? "miss" : variant}`;
  impact.style.left = `${target.x}px`;
  impact.style.top = `${target.y}px`;
  combatFx.append(projectile, impact);
  removeCombatFx(projectile, 700);
  removeCombatFx(impact, 900);
}

function setCombatHealth(unit, health, maxHealth) {
  if (!unit || !Number.isFinite(Number(health))) return;
  const maximum = Math.max(1, Number(maxHealth) || 1);
  const current = Math.max(0, Number(health));
  const percent = Math.max(0, Math.min(100, current / maximum * 100));
  const bar = unit.querySelector(".combat-fighter__health i");
  const value = unit.querySelector(".combat-fighter__health b");
  if (bar) bar.style.width = `${percent}%`;
  if (value) value.textContent = `${Math.ceil(current)} / ${maximum}`;
  unit.classList.toggle("is-danger", percent > 0 && percent <= 30);
  unit.classList.toggle("is-defeated", current <= 0);
}

function updateCombatRemaining() {
  combatFirstRemaining.textContent = combatFirstTeam.querySelectorAll(".combat-fighter:not(.is-defeated)").length;
  combatSecondRemaining.textContent = combatSecondTeam.querySelectorAll(".combat-fighter:not(.is-defeated)").length;
}

function pushCombatTimeline(event, index) {
  const item = document.createElement("li");
  item.className = `is-${event.type}${event.critical ? " is-critical" : ""}`;
  const result = event.type === "ability" ? event.abilityName : (event.type === "dodge" ? "Evaded" : (event.type === "knockout" ? "Knockout" : `${event.damage} damage`));
  item.innerHTML = `<b>${String(index + 1).padStart(2, "0")}</b><span><strong>${escapeHtml(event.actor)}</strong><small>${escapeHtml(result)}</small></span><em>${event.target ? escapeHtml(event.target) : "PROC"}</em>`;
  combatTimeline.prepend(item);
  while (combatTimeline.children.length > 5) combatTimeline.lastElementChild.remove();
}

function revealCombatResult(result, state) {
  const won = result.winnerId === state.me.id;
  const lost = result.loserId === state.me.id;
  combatResultBadge.textContent = result.draw ? "DRAW" : (won ? "VICTORY" : (lost ? "DEFEAT" : "COMPLETE"));
  combatResultBadge.classList.toggle("is-win", won);
  combatResultBadge.classList.toggle("is-loss", lost);
  combatElement.classList.add("is-final");
  window.PRWAudio?.play(won ? "victory" : (lost ? "defeat" : "round"));
}

function playCombatEvent(event, index, total, result, state) {
  combatArena.querySelectorAll(".is-attacking,.is-hit,.is-dodging,.is-targeted,.is-ability,.is-healing").forEach((unit) => {
    unit.classList.remove("is-attacking", "is-hit", "is-dodging", "is-targeted", "is-ability", "is-healing");
  });
  const progress = Math.round((index + 1) / Math.max(1, total) * 100);
  combatEventCounter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  combatEventProgress.style.width = `${progress}%`;

  if (event.type === "ability") {
    const actor = combatUnit(event.actorSide, event.actorIndex);
    actor?.classList.add("is-ability", "is-healing");
    setCombatHealth(actor, event.actorHealth, event.actorMaxHealth);
    floatingCombatText(actor, event.abilityName || "ABILITY", "ability");
    combatFeed.textContent = event.text;
    pushCombatTimeline(event, index);
    window.PRWAudio?.play("upgrade");
  } else {
    const attacker = combatUnit(event.actorSide, event.actorIndex);
    const defender = combatUnit(event.targetSide, event.targetIndex);
    attacker?.classList.add("is-attacking");
    if (event.abilityName && event.abilityName !== "Standard Attack") attacker?.classList.add("is-ability");
    defender?.classList.add("is-targeted", event.dodged ? "is-dodging" : "is-hit");
    launchCombatProjectile(attacker, defender, event);
    combatArena.classList.remove("is-impact", "is-heavy-impact");
    void combatArena.offsetWidth;
    combatArena.classList.add(event.critical || event.type === "knockout" ? "is-heavy-impact" : "is-impact");
    combatTimers.push(window.setTimeout(() => {
      setCombatHealth(defender, event.targetHealth, event.targetMaxHealth);
      setCombatHealth(attacker, event.actorHealth, event.actorMaxHealth);
      if (event.dodged) floatingCombatText(defender, "EVADE", "dodge");
      else floatingCombatText(defender, event.type === "knockout" ? "K.O." : `-${event.damage}`, event.critical ? "critical" : (event.type === "knockout" ? "knockout" : "damage"));
      if (event.healing > 0) {
        attacker?.classList.add("is-healing");
        floatingCombatText(attacker, `+${event.healing}`, "healing");
      }
      if (event.retaliationDamage > 0) floatingCombatText(attacker, `-${event.retaliationDamage} REFLECT`, "retaliation");
      updateCombatRemaining();
    }, 210));
    combatFeed.textContent = event.dodged
      ? `${event.target} evaded ${event.actor}'s attack.`
      : `${event.actor} dealt ${event.damage} damage to ${event.target}${event.critical ? " — critical hit!" : "."}`;
    pushCombatTimeline(event, index);
    window.PRWAudio?.play(event.type === "knockout" ? "eliminate" : (event.critical ? "critical" : "attack"), { critical: event.critical });
  }

  if (index === total - 1) combatTimers.push(window.setTimeout(() => revealCombatResult(result, state), 650));
}

function playCombat(state) {
  const result = state.combatResults.find((entry) => entry.firstId === state.me.id || entry.secondId === state.me.id)
    || state.combatResults[0];
  if (!result) return;
  combatElement.hidden = false;
  matchCompleteElement.hidden = true;
  formationField.hidden = true;
  combatFirstName.textContent = result.firstName;
  combatSecondName.textContent = result.secondName;
  combatTitle.textContent = `${result.firstName} vs ${result.secondName}`;
  if (playedCombatId === result.id) return;
  playedCombatId = result.id;
  clearCombatTimers();
  combatElement.scrollTop = 0;
  combatElement.classList.remove("is-final");
  combatResultBadge.classList.remove("is-win", "is-loss");
  combatResultBadge.textContent = "LIVE";
  combatRoundLabel.textContent = String(state.round).padStart(2, "0");
  combatFirstTeam.innerHTML = result.teams.first.map(combatFighterMarkup).join("") || '<p class="online-combat__empty">No deployed heroes</p>';
  combatSecondTeam.innerHTML = result.teams.second.map(combatFighterMarkup).join("") || '<p class="online-combat__empty">No deployed heroes</p>';
  combatFx.innerHTML = "";
  combatTimeline.innerHTML = "";
  combatFeed.textContent = "Targeting systems synchronized…";
  combatEventCounter.textContent = `00 / ${String(result.events.length).padStart(2, "0")}`;
  combatEventProgress.style.width = "0%";
  updateCombatRemaining();
  const interval = Math.min(520, Math.max(145, Math.floor(11_600 / Math.max(1, result.events.length))));
  if (!result.events.length) {
    combatFeed.textContent = "No opposition detected. Combat resolved by deployment strength.";
    combatTimers.push(window.setTimeout(() => revealCombatResult(result, state), 700));
    return;
  }
  result.events.forEach((event, index) => {
    combatTimers.push(window.setTimeout(() => playCombatEvent(event, index, result.events.length, result, state), 450 + index * interval));
  });
}

function renderComplete(state) {
  combatElement.hidden = false;
  formationField.hidden = true;
  clearCombatTimers();
  const champion = state.players.find((player) => player.id === state.championId);
  combatTitle.textContent = champion ? `${champion.name} Wins Online Operations` : "Operation Complete";
  combatResultBadge.textContent = state.championId === state.me.id ? "CHAMPION" : "GG";
  combatFeed.textContent = state.message;
  completeTitle.textContent = state.championId === state.me.id ? "You Are the Last Commander Standing" : `${champion?.name || "No Commander"} Won the Operation`;
  completeMessage.textContent = state.championId === state.me.id
    ? `Victory secured in round ${state.round}. Re-enter the network to defend your title.`
    : `Your run ended in round ${state.round}. Your completed match has been released and a new lobby is ready.`;
  matchCompleteElement.hidden = false;
  playAgainButton.disabled = false;
  if (!profileRecordedMatches.has(state.id)) {
    profileRecordedMatches.add(state.id);
    window.PRWProfileStats?.recordMatch({
      matchKey: `online:${state.id}`,
      mode: "online",
      outcome: state.championId === state.me.id ? "win" : "loss",
      heroes: state.me.team.filter(Boolean).map((hero) => hero.id),
    });
  }
}

function mergeCandidate(me) {
  const heroes = [...me.team, ...me.bench].filter((hero) => hero && hero.level < 4);
  for (let index = 0; index < heroes.length; index += 1) {
    const hero = heroes[index];
    if (heroes.slice(index + 1).some((candidate) => candidate.id === hero.id && candidate.level === hero.level)) return hero;
  }
  return null;
}

function resetToMatchmaking() {
  window.clearTimeout(pollTimer);
  clearCombatTimers();
  clearSession();
  currentState = null;
  selectedSlot = null;
  combatElement.hidden = true;
  matchCompleteElement.hidden = true;
  formationField.hidden = false;
  onlineGame.hidden = true;
  matchmakingScreen.hidden = false;
  queueProgress.hidden = true;
  queueError.hidden = true;
  joinButton.hidden = false;
  joinButton.disabled = false;
  joinButton.querySelector("b").textContent = "Find Online Match";
  setConnection("Ready for matchmaking", false);
  updateClock();
}

function findNewMatch() {
  playAgainButton.disabled = true;
  resetToMatchmaking();
  joinMatch();
}

function renderGame(state) {
  matchmakingScreen.hidden = true;
  onlineGame.hidden = false;
  setConnection("Live synchronized", true);
  const me = state.me;
  const locked = state.phase !== "build" || me.eliminated;
  healthElement.textContent = me.hp;
  roundElement.textContent = String(state.round).padStart(2, "0");
  creditsElement.textContent = me.credits;
  commanderName.textContent = me.name;
  unitCount.textContent = me.team.filter(Boolean).length;
  matchCode.textContent = `MATCH ${state.id.slice(0, 4).toUpperCase()}`;
  readyButton.disabled = locked;
  readyButton.classList.toggle("is-ready", me.ready);
  readyButton.setAttribute("aria-pressed", String(me.ready));
  readyButton.querySelector("span").textContent = me.ready ? "Ready!" : "Ready";
  const candidate = mergeCandidate(me);
  const candidateName = candidate ? (heroCatalog.get(candidate.id)?.name || candidate.name || "Hero") : null;
  mergeButton.disabled = locked || !candidate;
  mergeButton.classList.toggle("can-merge", Boolean(candidate) && !locked);
  mergeHint.textContent = candidate ? `${candidateName} → LV ${candidate.level + 1}` : "Matching pair required";
  renderRoster(teamElement, me.team, "team");
  renderRoster(benchElement, me.bench, "bench");
  renderTraits(me.team);
  renderShop(me, locked);
  renderLeaderboard(state);
  combatElement.hidden = state.phase !== "combat" && state.phase !== "complete";
  formationField.hidden = state.phase === "combat" || state.phase === "complete";
  if (state.phase === "combat") playCombat(state);
  if (state.phase === "complete") renderComplete(state);
}

function applyState(state) {
  currentState = state;
  serverClockOffset = Date.parse(state.serverTime) - Date.now();
  updateClock();
  if (state.phase === "waiting") renderQueue(state);
  else renderGame(state);
}

async function joinMatch() {
  if (requestInFlight) return;
  requestInFlight = true;
  joinButton.disabled = true;
  joinButton.querySelector("b").textContent = "Linking to Network…";
  queueError.hidden = true;
  setConnection("Matchmaking", false);
  try {
    const data = await apiRequest("join", null, false);
    saveSession({ matchId: data.matchId, playerId: data.playerId, playerToken: data.playerToken });
    applyState(data.state);
    schedulePoll(100);
  } catch (error) {
    queueError.textContent = error.message;
    queueError.hidden = false;
    joinButton.hidden = false;
    joinButton.disabled = false;
    joinButton.querySelector("b").textContent = "Find Online Match";
    setConnection("Offline", false);
  } finally {
    requestInFlight = false;
  }
}

async function pollMatch() {
  if (!session || requestInFlight) return schedulePoll();
  requestInFlight = true;
  try {
    const data = await apiRequest("poll");
    applyState(data.state);
  } catch (error) {
    if (error.status === 404 || error.status === 401) {
      clearSession();
      currentState = null;
      onlineGame.hidden = true;
      matchmakingScreen.hidden = false;
      joinButton.hidden = false;
      joinButton.disabled = false;
      queueProgress.hidden = true;
      queueError.textContent = `${error.message} Find a new online match.`;
      queueError.hidden = false;
      setConnection("Session ended", false);
      return;
    }
    setConnection("Reconnecting", false);
  } finally {
    requestInFlight = false;
  }
  schedulePoll();
}

function schedulePoll(delay = POLL_INTERVAL_MS) {
  window.clearTimeout(pollTimer);
  if (session) pollTimer = window.setTimeout(pollMatch, delay);
}

async function sendAction(action, payload = {}) {
  if (!session) return;
  if (requestInFlight) {
    window.setTimeout(() => sendAction(action, payload), 120);
    return;
  }
  requestInFlight = true;
  try {
    const data = await apiRequest(action, payload);
    selectedSlot = null;
    applyState(data.state);
    window.PRWAudio?.play(action === "buy" ? "purchase" : (action === "ready" ? "ready" : "click"));
  } catch (error) {
    showToast(error.message, true);
    window.PRWAudio?.play("error");
  } finally {
    requestInFlight = false;
    schedulePoll(250);
  }
}

function slotFromElement(element) {
  const slot = element.closest(".roster-slot");
  return slot ? { zone: slot.dataset.zone, index: Number(slot.dataset.index) } : null;
}

function moveSelected(target) {
  if (!selectedSlot || (selectedSlot.zone === target.zone && selectedSlot.index === target.index)) {
    selectedSlot = target;
    if (currentState) renderGame(currentState);
    return;
  }
  sendAction("move", { fromZone: selectedSlot.zone, fromIndex: selectedSlot.index, toZone: target.zone, toIndex: target.index });
}

function showHeroInfo(event, heroId) {
  const candidates = [
    ...(currentState?.me?.team || []),
    ...(currentState?.me?.bench || []),
    ...(currentState?.me?.shop || []),
  ];
  const hero = candidates.find((entry) => entry?.id === heroId) || heroCatalog.get(heroId);
  if (!hero) return;
  const traits = (hero.traits || []).map((trait) => traitDefinitions[trait]?.name || trait);
  heroInfo.innerHTML = `<span>${escapeHtml(hero.universe)} // Tier ${hero.tier}</span><h3>${escapeHtml(hero.name)}</h3><p><b>${escapeHtml(hero.ability?.name || "Combat Protocol")}</b> — ${escapeHtml(hero.ability?.description || "Uses base power and health in combat.")}</p><div><i>◆ ${heroPower({ ...hero, level: hero.level || 1 })} Power</i><i>♥ ${heroHealth({ ...hero, level: hero.level || 1 })} Health</i>${traits.map((trait) => `<i>${escapeHtml(trait)}</i>`).join("")}</div>`;
  heroInfo.hidden = false;
  const width = 320;
  heroInfo.style.left = `${Math.min(window.innerWidth - width - 12, event.clientX + 16)}px`;
  heroInfo.style.top = `${Math.min(window.innerHeight - heroInfo.offsetHeight - 12, event.clientY + 14)}px`;
}

joinButton.addEventListener("click", joinMatch);
playAgainButton.addEventListener("click", findNewMatch);
fillWithAiButton.addEventListener("click", () => sendAction("start-now"));
readyButton.addEventListener("click", () => sendAction("ready"));
mergeButton.addEventListener("click", () => sendAction("merge"));
rerollButton.addEventListener("click", () => sendAction("reroll"));
upgradeButton.addEventListener("click", () => sendAction("upgrade"));
freezeButton.addEventListener("click", () => sendAction("freeze"));

document.addEventListener("click", (event) => {
  const buyButton = event.target.closest("[data-buy-index]");
  if (buyButton) return void sendAction("buy", { index: Number(buyButton.dataset.buyIndex) });
  const sellButton = event.target.closest("[data-sell-zone]");
  if (sellButton) return void sendAction("sell", { zone: sellButton.dataset.sellZone, index: Number(sellButton.dataset.sellIndex) });
  const slot = slotFromElement(event.target);
  if (slot && currentState?.phase === "build") moveSelected(slot);
});

document.addEventListener("dragstart", (event) => {
  const hero = event.target.closest("[data-source-zone]");
  if (!hero) return;
  selectedSlot = { zone: hero.dataset.sourceZone, index: Number(hero.dataset.sourceIndex) };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(selectedSlot));
});
document.addEventListener("dragover", (event) => {
  const slot = event.target.closest(".roster-slot");
  if (!slot) return;
  event.preventDefault();
  slot.classList.add("is-target");
});
document.addEventListener("dragleave", (event) => event.target.closest(".roster-slot")?.classList.remove("is-target"));
document.addEventListener("drop", (event) => {
  const target = slotFromElement(event.target);
  if (!target || !selectedSlot) return;
  event.preventDefault();
  event.target.closest(".roster-slot")?.classList.remove("is-target");
  moveSelected(target);
});
document.addEventListener("dragend", () => document.querySelectorAll(".is-target").forEach((element) => element.classList.remove("is-target")));

document.addEventListener("pointermove", (event) => {
  const source = event.target.closest("[data-hero-info]");
  if (source && event.pointerType !== "touch") showHeroInfo(event, source.dataset.heroInfo);
  else heroInfo.hidden = true;
});
document.addEventListener("pointerleave", () => { heroInfo.hidden = true; });

window.addEventListener("beforeunload", () => window.clearTimeout(pollTimer));

async function initialize() {
  await loadReferenceData().catch(() => {});
  restoreSession();
  clockTimer = window.setInterval(updateClock, 250);
  if (session) {
    joinButton.hidden = true;
    queueProgress.hidden = false;
    setConnection("Restoring match", false);
    pollMatch();
  }
}

initialize();
