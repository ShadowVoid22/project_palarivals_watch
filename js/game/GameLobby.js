"use strict";

const creditsElement = document.querySelector("#currentCredits");
const unitCountElement = document.querySelector("#unitCount");
const sidelineCountElement = document.querySelector("#sidelineCount");
const traitListElement = document.querySelector("#traitList");
const gameStatusElement = document.querySelector("#gameStatus");
const deploymentWorkspace = document.querySelector("#deploymentWorkspace");
const spectatorBuildBoard = document.querySelector("#spectatorBuildBoard");
const spectatorBuildGrid = document.querySelector("#spectatorBuildGrid");
const spectatorBuilderCount = document.querySelector("#spectatorBuilderCount");
const teamBoard = document.querySelector("#teamBoard");
const sidelineBoard = document.querySelector("#sidelineBoard");
const teamSlots = [...teamBoard.querySelectorAll(".team-slot")];
const benchSlots = [...sidelineBoard.querySelectorAll(".team-slot")];
const rosterSlots = [...document.querySelectorAll(".roster-slot")];
const shopCards = [...document.querySelectorAll(".shop-card")];
const shopDeck = document.querySelector(".shop-deck");
const shopRailStatus = document.querySelector(".shop-deck__rail span:last-child");
const rerollButton = document.querySelector("#rerollShop");
const freezeShopButton = document.querySelector("#freezeShop");
const freezeShopLabel = freezeShopButton.querySelector("strong");
const freezeShopHint = freezeShopButton.querySelector("small");
const upgradeShopButton = document.querySelector("#upgradeShop");
const upgradeShopCostElement = document.querySelector("#upgradeShopCost");
const upgradeShopHintElement = document.querySelector("#upgradeShopHint");
const shopTierElement = document.querySelector("#shopTierValue");
const buildTimerElement = document.querySelector("#buildTimer");
const buildTimerChip = buildTimerElement.closest(".hud-chip");
const buildTimerRing = buildTimerChip.querySelector(".timer-ring");
const playerHealthElement = document.querySelector("#playerHealth");
const roundValueElement = document.querySelector("#roundValue");
const teamTitleElement = document.querySelector("#team-title");
const teamKickerElement = document.querySelector(".stage-header .kicker");
const combatArena = document.querySelector("#combatArena");
const combatMatchup = document.querySelector(".combat-matchup");
const spectatorCombatBroadcast = document.querySelector("#spectatorCombatBroadcast");
const spectatorCombatGrid = document.querySelector("#spectatorCombatGrid");
const spectatorBattleCount = document.querySelector("#spectatorBattleCount");
const playerCombatTeam = document.querySelector("#playerCombatTeam");
const enemyCombatTeam = document.querySelector("#enemyCombatTeam");
const playerCombatLabel = document.querySelector("#playerCombatLabel");
const playerCombatName = document.querySelector("#playerCombatName");
const enemyCombatName = document.querySelector("#enemyCombatName");
const combatFeed = document.querySelector("#combatFeed");
const combatFxLayer = document.querySelector("#combatFxLayer");
const combatTimeline = document.querySelector("#combatTimeline");
const combatRoundBadge = document.querySelector("#combatRoundBadge");
const combatEventCounter = document.querySelector("#combatEventCounter");
const combatEventProgress = document.querySelector("#combatEventProgress");
const playerCombatRemaining = document.querySelector("#playerCombatRemaining");
const enemyCombatRemaining = document.querySelector("#enemyCombatRemaining");
const combatRoundResult = document.querySelector("#combatRoundResult");
const combatRoundResultKicker = document.querySelector("#combatRoundResultKicker");
const combatRoundResultTitle = document.querySelector("#combatRoundResultTitle");
const combatRoundResultDetail = document.querySelector("#combatRoundResultDetail");
const combatRecapButton = document.querySelector("#combatRecapButton");
const combatRecap = document.querySelector("#combatRecap");
const combatRecapSubtitle = document.querySelector("#combatRecapSubtitle");
const combatRecapTeams = document.querySelector("#combatRecapTeams");
const combatRecapContinue = document.querySelector("#combatRecapContinue");
const closeCombatRecapButtons = [...document.querySelectorAll("[data-close-recap]")];
const spectatorControls = document.querySelector("#spectatorControls");
const spectatorPrevious = document.querySelector("#spectatorPrevious");
const spectatorNext = document.querySelector("#spectatorNext");
const spectatorMatchLabel = document.querySelector("#spectatorMatchLabel");
const playerListElement = document.querySelector("#playerList");
const onlineCountElement = document.querySelector("#onlineCount");
const nextThreatNameElement = document.querySelector("#nextThreatName");
const nextThreatStatusElement = document.querySelector("#nextThreatStatus");
const matchPhaseLabel = document.querySelector("#matchPhaseLabel");
const matchResult = document.querySelector("#matchResult");
const matchResultKicker = document.querySelector("#matchResultKicker");
const matchResultTitle = document.querySelector("#matchResultTitle");
const matchResultDescription = document.querySelector("#matchResultDescription");
const spectateMatchButton = document.querySelector("#spectateMatchButton");
const readyButton = document.querySelector("#readyButton");
const brandExit = document.querySelector("#brandExit");
const leaveGameButton = document.querySelector("#leaveGameButton");
const leaveGameModal = document.querySelector("#leaveGameModal");
const stayInGameButton = document.querySelector("#stayInGameButton");
const closeLeaveModalButtons = [...document.querySelectorAll("[data-close-leave-modal]")];
const heroInfoPopover = document.querySelector("#heroInfoPopover");
const heroInfoPopoverContent = document.querySelector("#heroInfoPopoverContent");
const scoutOverlay = document.querySelector("#scoutOverlay");
const scoutPlayerAvatar = document.querySelector("#scoutPlayerAvatar");
const scoutPlayerName = document.querySelector("#scoutPlayerName");
const scoutPlayerStatus = document.querySelector("#scoutPlayerStatus");
const scoutPlayerSummary = document.querySelector("#scoutPlayerSummary");
const scoutTraitList = document.querySelector("#scoutTraitList");
const scoutFormation = document.querySelector("#scoutFormation");
const closeScoutButtons = [...document.querySelectorAll("[data-close-scout]")];

const gameState = {
  credits: Number(creditsElement.textContent),
  shopTier: 1,
  round: 1,
  phase: "build",
  buildPhaseActive: true,
  buildEndsAt: null,
  pairings: [],
  combatResults: [],
  viewedCombatResult: null,
  viewedPairingIndex: 0,
  spectating: false,
  spectatedPlayerId: null,
  eliminationPromptOpen: false,
  scoutedPlayerId: null,
  recapPausedRound: false,
  selectedShopId: null,
  shopFrozen: false,
  team: Array(6).fill(null),
  bench: Array(6).fill(null),
  drag: null,
};

const MAX_SHOP_TIER = 4;
const MAX_HERO_LEVEL = 4;
const LEVEL_STAT_MULTIPLIERS = [1, 1.5, 2.25, 3.25];
const SHOP_UPGRADE_COSTS = { 1: 4, 2: 6, 3: 8 };
const BUILD_PHASE_DURATION = 60_000;
const COMBAT_EVENT_DURATION = 780;
const COMBAT_RESULT_DURATION = 12_000;
const AI_NAME_SOURCE = "data/ai-names.json";
const HERO_ABILITY_SOURCE = "data/hero-abilities.json";
const HERO_TRAIT_SOURCE = "data/hero-traits.json";
const FALLBACK_AI_NAMES = [
  "NovaVex",
  "RocketLynx",
  "ArcRunner",
  "PalKeeper",
  "StarTank",
  "HeroDraft",
  "Nexus",
  "NeonVanguard",
  "QuantumWarden",
  "PixelPhantom",
  "SolarStriker",
  "VoidRanger",
];
let buildTimerInterval = null;
let combatPhaseTimeout = null;
let nextRoundTimeout = null;
let readyLaunchTimeout = null;
let aiBuildTimers = [];
let traitDefinitions = {};

const heroCatalog = [
  { id: "groot", name: "Groot", universe: "marvel", image: "Img/Characters/MarvelRivals/GrootPNG.png", logo: "Img/Icons/MarvelRivalsLogo.png", power: 7, health: 10, cost: 3, tier: 2 },
  { id: "hulk", name: "Hulk", universe: "marvel", image: "Img/Characters/MarvelRivals/HulkPNG.png", logo: "Img/Icons/MarvelRivalsLogo.png", power: 10, health: 12, cost: 5, tier: 4 },
  { id: "iron-man", name: "Iron Man", universe: "marvel", image: "Img/Characters/MarvelRivals/IronManPNG.png", logo: "Img/Icons/MarvelRivalsLogo.png", power: 8, health: 6, cost: 4, tier: 2 },
  { id: "spider-man", name: "Spider-Man", universe: "marvel", image: "Img/Characters/MarvelRivals/SpiderManPNG.png", logo: "Img/Icons/MarvelRivalsLogo.png", power: 7, health: 5, cost: 3, tier: 1 },
  { id: "thor", name: "Thor", universe: "marvel", image: "Img/Characters/MarvelRivals/ThorPNG.png", logo: "Img/Icons/MarvelRivalsLogo.png", power: 9, health: 9, cost: 4, tier: 3 },
  { id: "bastion", name: "Bastion", universe: "overwatch", image: "Img/Characters/Overwatch/BastionPNG.png", logo: "Img/Icons/OverwatchLogo.png", power: 9, health: 7, cost: 3, tier: 2 },
  { id: "genji", name: "Genji", universe: "overwatch", image: "Img/Characters/Overwatch/GenjiPNG.png", logo: "Img/Icons/OverwatchLogo.png", power: 6, health: 5, cost: 3, tier: 2 },
  { id: "junkrat", name: "Junkrat", universe: "overwatch", image: "Img/Characters/Overwatch/JunkratPNG.png", logo: "Img/Icons/OverwatchLogo.png", power: 7, health: 4, cost: 2, tier: 1 },
  { id: "roadhog", name: "Roadhog", universe: "overwatch", image: "Img/Characters/Overwatch/Roadhog.png", logo: "Img/Icons/OverwatchLogo.png", power: 6, health: 14, cost: 3, tier: 3 },
  { id: "tracer", name: "Tracer", universe: "overwatch", image: "Img/Characters/Overwatch/TracerPNG.png", logo: "Img/Icons/OverwatchLogo.png", power: 5, health: 4, cost: 2, tier: 1 },
  { id: "bomb-king", name: "Bomb King", universe: "paladins", image: "Img/Characters/Paladins/BombKingPNG.png", logo: "Img/Icons/PaladinsLogo.png", power: 10, health: 8, cost: 4, tier: 3 },
  { id: "drogoz", name: "Drogoz", universe: "paladins", image: "Img/Characters/Paladins/DrogozPNG.png", logo: "Img/Icons/PaladinsLogo.png", power: 8, health: 6, cost: 3, tier: 2 },
  { id: "moji", name: "Moji", universe: "paladins", image: "Img/Characters/Paladins/MojiPNG.png", logo: "Img/Icons/PaladinsLogo.png", power: 5, health: 7, cost: 2, tier: 1 },
  { id: "raum", name: "Raum", universe: "paladins", image: "Img/Characters/Paladins/RaumPNG.png", logo: "Img/Icons/PaladinsLogo.png", power: 7, health: 12, cost: 4, tier: 4 },
  { id: "seris", name: "Seris", universe: "paladins", image: "Img/Characters/Paladins/SerisPNG.png", logo: "Img/Icons/PaladinsLogo.png", power: 4, health: 8, cost: 3, tier: 2 },
];

function heroCatalogId(hero) {
  return hero?.catalogId || hero?.id;
}

function applyHeroLevelStats(hero) {
  const catalogHero = heroCatalog.find((entry) => entry.id === heroCatalogId(hero));
  hero.level = Math.min(MAX_HERO_LEVEL, Math.max(1, Number(hero.level) || 1));
  hero.basePower = Number(hero.basePower ?? catalogHero?.power ?? hero.power);
  hero.baseHealth = Number(hero.baseHealth ?? catalogHero?.health ?? hero.health);
  const multiplier = LEVEL_STAT_MULTIPLIERS[hero.level - 1];
  hero.power = Math.max(1, Math.round(hero.basePower * multiplier));
  hero.health = Math.max(1, Math.round(hero.baseHealth * multiplier));
  return hero;
}

function createHeroInstance(hero) {
  return applyHeroLevelStats({
    ...hero,
    catalogId: heroCatalogId(hero),
    basePower: hero.basePower ?? hero.power,
    baseHealth: hero.baseHealth ?? hero.health,
    level: hero.level || 1,
  });
}

const players = [
  { id: "player", name: "You", initials: "YO", avatar: "cyan", hp: 100, team: gameState.team, isHuman: true, eliminated: false, ready: false, buildStatus: "Commanding" },
  { id: "novavex", name: "NovaVex", initials: "NV", avatar: "violet", hp: 100, team: [], isHuman: false, eliminated: false, ready: false, buildStatus: "Preparing" },
  { id: "rocketlynx", name: "RocketLynx", initials: "RL", avatar: "orange", hp: 100, team: [], isHuman: false, eliminated: false, ready: false, buildStatus: "Preparing" },
  { id: "arcrunner", name: "ArcRunner", initials: "AR", avatar: "pink", hp: 100, team: [], isHuman: false, eliminated: false, ready: false, buildStatus: "Preparing" },
  { id: "palkeeper", name: "PalKeeper", initials: "PK", avatar: "green", hp: 100, team: [], isHuman: false, eliminated: false, ready: false, buildStatus: "Preparing" },
  { id: "startank", name: "StarTank", initials: "ST", avatar: "blue", hp: 100, team: [], isHuman: false, eliminated: false, ready: false, buildStatus: "Preparing" },
  { id: "herodraft", name: "HeroDraft", initials: "HD", avatar: "yellow", hp: 100, team: [], isHuman: false, eliminated: false, ready: false, buildStatus: "Preparing" },
  { id: "nexus", name: "Nexus", initials: "NX", avatar: "red", hp: 100, team: [], isHuman: false, eliminated: false, ready: false, buildStatus: "Preparing" },
];

const shopHeroes = new Map(
  shopCards.map((card) => [
    card.dataset.shopId,
    {
      id: card.dataset.shopId,
      catalogId: card.dataset.heroId,
      name: card.dataset.name,
      universe: card.dataset.universe,
      image: card.dataset.image,
      logo: card.dataset.logo,
      power: Number(card.dataset.power),
      health: Number(card.dataset.health),
      basePower: Number(card.dataset.power),
      baseHealth: Number(card.dataset.health),
      level: 1,
      cost: Number(card.dataset.cost),
      card,
    },
  ]),
);

let pointerDrag = null;
let exitTrigger = null;
let activeHeroInfoAnchor = null;
let heroInfoPositionFrame = null;

async function loadHeroAbilities() {
  try {
    const response = await fetch(HERO_ABILITY_SOURCE, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Hero ability list returned ${response.status}.`);
    }

    const abilityData = await response.json();
    const abilities = abilityData?.abilities || {};

    heroCatalog.forEach((hero) => {
      hero.ability = abilities[hero.id] || null;
    });
  } catch {
    heroCatalog.forEach((hero) => {
      hero.ability = null;
    });
  }
}

async function loadHeroTraits() {
  try {
    const response = await fetch(HERO_TRAIT_SOURCE, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Hero trait list returned ${response.status}.`);
    }

    const traitData = await response.json();
    traitDefinitions = traitData?.traits || {};
    const heroTraits = traitData?.heroes || {};

    heroCatalog.forEach((hero) => {
      hero.traits = Array.isArray(heroTraits[hero.id]) ? heroTraits[hero.id].slice(0, 3) : [];
    });
  } catch {
    traitDefinitions = {};
    heroCatalog.forEach((hero) => {
      hero.traits = [];
    });
  }
}

function heroTraitIds(hero) {
  return Array.isArray(hero?.traits) ? hero.traits.slice(0, 3) : [];
}

function countTeamTraits(team) {
  const uniqueHeroesByTrait = new Map();

  team.filter(Boolean).forEach((hero) => {
    const heroId = heroCatalogId(hero);

    heroTraitIds(hero).forEach((traitId) => {
      if (!uniqueHeroesByTrait.has(traitId)) {
        uniqueHeroesByTrait.set(traitId, new Set());
      }

      uniqueHeroesByTrait.get(traitId).add(heroId);
    });
  });

  return new Map(
    [...uniqueHeroesByTrait].map(([traitId, uniqueHeroIds]) => [traitId, uniqueHeroIds.size]),
  );
}

function traitState(traitId, team) {
  const definition = traitDefinitions[traitId];
  const count = countTeamTraits(team).get(traitId) || 0;
  const tiers = definition?.tiers || [];
  let activeTier = null;

  tiers.forEach((tier) => {
    if (count >= tier.threshold) {
      activeTier = tier;
    }
  });

  return {
    id: traitId,
    definition,
    count,
    activeTier,
    nextTier: tiers.find((tier) => count < tier.threshold) || null,
  };
}

function combineCombatEffects(...effectSets) {
  return effectSets.reduce((combined, effects) => {
    Object.entries(effects || {}).forEach(([effectName, value]) => {
      if (typeof value === "number") {
        combined[effectName] = (combined[effectName] || 0) + value;
      }
    });
    return combined;
  }, {});
}

function heroTraitCombatData(hero, team) {
  const heroTraits = new Set(heroTraitIds(hero));
  const activeTraits = [...countTeamTraits(team).keys()]
    .filter((traitId) => heroTraits.has(traitId))
    .map((traitId) => traitState(traitId, team))
    .filter((state) => state.activeTier);

  return {
    effects: combineCombatEffects(...activeTraits.map((state) => state.activeTier.effects)),
    abilities: activeTraits.map((state) => state.definition.ability),
    traitIds: activeTraits.map((state) => state.id),
  };
}

function traitCategoryLabel(category) {
  if (category === "world") {
    return "World";
  }

  return category === "playstyle" ? "Playstyle" : "Role";
}

function renderTraitPanel() {
  const counts = countTeamTraits(gameState.team);
  const categoryOrder = { world: 0, playstyle: 1, role: 2 };
  const visibleTraits = [...counts.keys()]
    .map((traitId) => traitState(traitId, gameState.team))
    .filter((state) => state.definition)
    .sort((first, second) => {
      const categoryDifference = categoryOrder[first.definition.category] - categoryOrder[second.definition.category];
      return categoryDifference || second.count - first.count || first.definition.name.localeCompare(second.definition.name);
    });

  if (!visibleTraits.length) {
    traitListElement.innerHTML = '<span class="trait-list__empty">Deploy a hero to begin building trait synergies.</span>';
    return;
  }

  traitListElement.innerHTML = visibleTraits.map((state) => {
    const { definition, count, activeTier, nextTier } = state;
    const tierText = activeTier
      ? `${definition.ability}: ${activeTier.text}`
      : `Needs ${nextTier.threshold - count} more: ${nextTier.text}`;
    const milestoneMarkup = definition.tiers.map((tier) => `
      <i class="${count >= tier.threshold ? "is-reached" : ""}${activeTier?.threshold === tier.threshold ? " is-current" : ""}">${tier.threshold}</i>
    `).join("");

    return `
      <article class="trait-item trait-item--${definition.category}${activeTier ? " trait-item--active" : ""}" title="${definition.description}">
        <span class="trait-item__category">${traitCategoryLabel(definition.category)}</span>
        <strong class="trait-item__name">${definition.name}</strong>
        <b class="trait-item__count">${count}</b>
        <span class="trait-item__milestones">${milestoneMarkup}</span>
        <small>${tierText}</small>
      </article>
    `;
  }).join("");
}

function createPlayerInitials(name) {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return (words[0] || "AI").slice(0, 2).toUpperCase();
}

function shuffledUniqueNames(names, count) {
  const seenNames = new Set(["you"]);
  const uniqueNames = names.reduce((pool, name) => {
    const cleanName = typeof name === "string" ? name.trim() : "";
    const nameKey = cleanName.toLocaleLowerCase();

    if (cleanName && !seenNames.has(nameKey)) {
      seenNames.add(nameKey);
      pool.push(cleanName);
    }

    return pool;
  }, []);

  for (let index = uniqueNames.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [uniqueNames[index], uniqueNames[randomIndex]] = [uniqueNames[randomIndex], uniqueNames[index]];
  }

  return uniqueNames.slice(0, count);
}

async function assignRandomAiNames() {
  const aiPlayers = players.filter((player) => !player.isHuman);
  let availableNames = FALLBACK_AI_NAMES;

  try {
    const response = await fetch(AI_NAME_SOURCE, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`AI name list returned ${response.status}.`);
    }

    const nameData = await response.json();

    if (Array.isArray(nameData.names)) {
      availableNames = nameData.names;
    }
  } catch {
    availableNames = FALLBACK_AI_NAMES;
  }

  let selectedNames = shuffledUniqueNames(availableNames, aiPlayers.length);

  if (selectedNames.length < aiPlayers.length) {
    selectedNames = shuffledUniqueNames(
      [...selectedNames, ...FALLBACK_AI_NAMES],
      aiPlayers.length,
    );
  }

  aiPlayers.forEach((player, index) => {
    const randomName = selectedNames[index] || `Rival${index + 1}`;
    player.name = randomName;
    player.initials = createPlayerInitials(randomName);
  });
}

function announce(message) {
  gameStatusElement.textContent = "";
  window.requestAnimationFrame(() => {
    gameStatusElement.textContent = message;
  });
}

function openLeaveGameModal(trigger) {
  exitTrigger = trigger;
  leaveGameModal.hidden = false;
  document.body.classList.add("modal-open");
  window.PRWAudio?.play("modalOpen");
  stayInGameButton.focus();
  announce("Leave game confirmation opened.");
}

function closeLeaveGameModal() {
  leaveGameModal.hidden = true;
  document.body.classList.remove("modal-open");
  window.PRWAudio?.play("modalClose");
  exitTrigger?.focus();
  exitTrigger = null;
  announce("Leave game cancelled.");
}

function handleModalKeyboard(event) {
  if (leaveGameModal.hidden) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeLeaveGameModal();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = [...leaveGameModal.querySelectorAll("button, a[href]")];
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function getHumanPlayer() {
  return players.find((player) => player.isHuman);
}

function getAlivePlayers() {
  return players.filter((player) => !player.eliminated);
}

function renderReadyButton() {
  const humanPlayer = getHumanPlayer();
  const canReady = gameState.phase === "build" && gameState.buildPhaseActive && !humanPlayer.eliminated;
  readyButton.disabled = !canReady;
  readyButton.classList.toggle("ready-button--active", humanPlayer.ready && canReady);
  readyButton.setAttribute("aria-pressed", String(humanPlayer.ready && canReady));
  readyButton.querySelector("strong").textContent = humanPlayer.ready && canReady ? "Ready!" : "Ready";
}

function checkAllPlayersReady() {
  if (gameState.phase !== "build" || !gameState.buildPhaseActive) {
    return;
  }

  const alivePlayers = getAlivePlayers();
  const readyPlayers = alivePlayers.filter((player) => player.ready);

  if (readyPlayers.length !== alivePlayers.length) {
    window.clearTimeout(readyLaunchTimeout);
    readyLaunchTimeout = null;
    matchPhaseLabel.textContent = `${readyPlayers.length}/${alivePlayers.length} ready`;
    return;
  }

  if (!readyLaunchTimeout) {
    matchPhaseLabel.textContent = "All ready · deploying";
    announce("All active players are ready. Combat is starting early.");
    readyLaunchTimeout = window.setTimeout(() => {
      readyLaunchTimeout = null;
      finishBuildPhase();
    }, 900);
  }
}

function markHumanNotReady() {
  const humanPlayer = getHumanPlayer();

  if (!humanPlayer.ready || gameState.phase !== "build") {
    return;
  }

  humanPlayer.ready = false;
  window.clearTimeout(readyLaunchTimeout);
  readyLaunchTimeout = null;
  renderReadyButton();
  renderLeaderboard();
  checkAllPlayersReady();
}

function toggleHumanReady() {
  if (gameState.phase !== "build" || !gameState.buildPhaseActive) {
    return;
  }

  const humanPlayer = getHumanPlayer();
  humanPlayer.ready = !humanPlayer.ready;
  window.PRWAudio?.play(humanPlayer.ready ? "ready" : "unready");
  renderReadyButton();
  renderLeaderboard();
  announce(humanPlayer.ready ? "You are ready for combat." : "Ready status cancelled.");
  checkAllPlayersReady();
}

function shuffleArray(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function renderLeaderboard() {
  const rankedPlayers = [...players].sort((first, second) => {
    if (first.eliminated !== second.eliminated) {
      return Number(first.eliminated) - Number(second.eliminated);
    }

    return second.hp - first.hp;
  });

  playerListElement.innerHTML = rankedPlayers.map((player, index) => {
    const status = player.eliminated
      ? "Eliminated"
      : player.isHuman
        ? (gameState.phase === "combat"
          ? "In combat"
          : `${player.ready ? "Ready · " : ""}${player.team.filter(Boolean).length}/6 deployed`)
        : player.buildStatus;
    const commanderTag = player.isHuman ? "<small>Commander</small>" : "";

    const scoutLabel = player.isHuman ? "Inspect your squad" : `Scout ${player.name}`;

    return `
      <li class="player-row${player.isHuman ? " player-row--you" : ""}${player.ready && !player.eliminated ? " player-row--ready" : ""}${player.eliminated ? " player-row--eliminated" : ""}${gameState.scoutedPlayerId === player.id ? " player-row--scouted" : ""}" data-player-id="${player.id}" role="button" tabindex="0" aria-label="${scoutLabel}. ${player.eliminated ? "Eliminated" : `${player.hp} health`}">
        <span class="rank">${String(index + 1).padStart(2, "0")}</span>
        <span class="player-avatar avatar--${player.avatar}">${player.initials}</span>
        <div class="player-data">
          <span class="player-name">${player.name} ${commanderTag}</span>
          <span class="player-status">${status}</span>
          <span class="hp-track"><i style="--hp: ${player.hp}%"></i></span>
        </div>
        <span class="hp-value">${player.eliminated ? "OUT" : player.hp}</span>
        <span class="player-scout-cue" aria-hidden="true">SCOUT</span>
      </li>
    `;
  }).join("");

  onlineCountElement.textContent = getAlivePlayers().length;

  if (!scoutOverlay.hidden && gameState.scoutedPlayerId) {
    renderScoutPanel(players.find((player) => player.id === gameState.scoutedPlayerId));
  }
}

function scoutingStatus(player) {
  if (player.eliminated) return "Eliminated // Final formation archived";
  if (gameState.phase === "combat") return "In combat // Formation locked";
  if (player.isHuman) return `${player.team.filter(Boolean).length}/6 heroes deployed`;
  return `${player.buildStatus} // ${player.team.filter(Boolean).length}/6 heroes detected`;
}

function scoutingHeroMarkup(hero, index) {
  if (!hero) {
    return `<article class="scout-hero scout-hero--empty"><span>${String(index + 1).padStart(2, "0")}</span><b>Empty</b></article>`;
  }

  const traits = heroTraitIds(hero)
    .map((traitId) => traitDefinitions[traitId]?.name)
    .filter(Boolean)
    .join(" · ");

  return `
    <article class="scout-hero" tabindex="0" aria-label="${hero.name}, level ${hero.level || 1}, ${hero.power} power, ${hero.health} health">
      <span class="scout-hero__index">${String(index + 1).padStart(2, "0")}</span>
      <img src="${hero.image}" alt="${hero.name}">
      <div><strong>${hero.name}</strong><small>${hero.ability?.name || "Standard Attack"}</small></div>
      <b>LV ${hero.level || 1}</b>
      <p><span>✦ ${hero.power}</span><span>♥ ${hero.health}</span></p>
      ${traits ? `<em>${traits}</em>` : ""}
    </article>
  `;
}

function renderScoutPanel(player) {
  if (!player) return;

  const deployedTeam = player.team.filter(Boolean);
  const traitCounts = countTeamTraits(deployedTeam);
  const totalPower = deployedTeam.reduce((total, hero) => total + hero.power, 0);
  const totalHealth = deployedTeam.reduce((total, hero) => total + hero.health, 0);
  const activeTraits = [...traitCounts]
    .map(([traitId, count]) => ({ traitId, count, definition: traitDefinitions[traitId] }))
    .filter(({ definition }) => definition)
    .sort((first, second) => second.count - first.count);

  scoutPlayerAvatar.className = `scout-panel__avatar avatar--${player.avatar}`;
  scoutPlayerAvatar.textContent = player.initials;
  scoutPlayerName.textContent = player.name;
  scoutPlayerStatus.textContent = scoutingStatus(player);
  scoutPlayerSummary.innerHTML = `
    <span><small>Integrity</small><strong>${player.eliminated ? "OUT" : player.hp}</strong></span>
    <span><small>Units Seen</small><strong>${deployedTeam.length}/6</strong></span>
    <span><small>Squad Power</small><strong>${totalPower}</strong></span>
    <span><small>Squad Health</small><strong>${totalHealth}</strong></span>
  `;
  scoutTraitList.innerHTML = activeTraits.length
    ? activeTraits.map(({ traitId, count, definition }) => {
      const state = traitState(traitId, deployedTeam);
      return `<span class="scout-trait${state.activeTier ? " scout-trait--active" : ""}"><b>${definition.name}</b><i>${count}</i><small>${state.activeTier ? `${state.activeTier.threshold}-unit active` : "Inactive"}</small></span>`;
    }).join("")
    : "<p>No trait data detected yet.</p>";
  scoutFormation.innerHTML = Array.from({ length: 6 }, (_, index) => scoutingHeroMarkup(deployedTeam[index], index)).join("");
}

function openScoutPanel(playerId) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player) return;

  gameState.scoutedPlayerId = player.id;
  renderScoutPanel(player);
  renderLeaderboard();
  scoutOverlay.hidden = false;
  scoutOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("intel-overlay-open");
  scoutOverlay.querySelector(".intel-close")?.focus();
  window.PRWAudio?.play("modalOpen");
  announce(`Scouting report opened for ${player.name}.`);
}

function closeScoutPanel() {
  if (scoutOverlay.hidden) return;
  scoutOverlay.hidden = true;
  scoutOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("intel-overlay-open");
  gameState.scoutedPlayerId = null;
  renderLeaderboard();
  window.PRWAudio?.play("modalClose");
}

function getHumanPairing() {
  return gameState.pairings.find((pairing) => pairing.some((player) => player.isHuman));
}

function renderThreatPreview() {
  if (gameState.spectating) {
    const observedPlayer = players.find((player) => player.id === gameState.spectatedPlayerId && !player.eliminated)
      || getAlivePlayers()[0];
    nextThreatNameElement.textContent = observedPlayer?.name || "Spectator Network";
    nextThreatStatusElement.textContent = observedPlayer
      ? `Following commander · ${observedPlayer.team.length}/6 heroes`
      : "Waiting for final result";
    return;
  }

  const pairing = getHumanPairing();
  const opponent = pairing?.find((player) => !player.isHuman);

  if (!opponent) {
    nextThreatNameElement.textContent = "Awaiting Pairing";
    nextThreatStatusElement.textContent = "Scanning remaining combatants";
    return;
  }

  nextThreatNameElement.textContent = opponent.name;
  nextThreatStatusElement.textContent = opponent.isGhost
    ? "Echo squad detected"
    : `${opponent.ready ? "Ready" : opponent.buildStatus} · ${opponent.team.length}/6 heroes`;
}

function spectatorBuildHeroMarkup(hero, index) {
  if (!hero) {
    return `<span class="spectator-builder__empty"><i>${String(index + 1).padStart(2, "0")}</i><b>Open</b></span>`;
  }

  return `
    <span class="spectator-builder__hero" title="${hero.name} // Level ${hero.level || 1} // ${hero.power} power // ${hero.health} health">
      <img src="${hero.image}" alt="${hero.name}">
      <i>LV ${hero.level || 1}</i>
      <b>${hero.name}</b>
      <small><em>✦ ${hero.power}</em><em>♥ ${hero.health}</em></small>
    </span>
  `;
}

function spectatorBuilderMarkup(player, rank) {
  const deployedTeam = player.team.filter(Boolean);
  const totalPower = deployedTeam.reduce((total, hero) => total + hero.power, 0);
  const totalHealth = deployedTeam.reduce((total, hero) => total + hero.health, 0);
  const traitCounts = [...countTeamTraits(deployedTeam)]
    .map(([traitId]) => traitState(traitId, deployedTeam))
    .filter((state) => state.definition)
    .sort((first, second) => Number(Boolean(second.activeTier)) - Number(Boolean(first.activeTier)) || second.count - first.count)
    .slice(0, 5);

  return `
    <article class="spectator-builder${player.ready ? " spectator-builder--ready" : ""}" data-player-id="${player.id}" role="button" tabindex="0" aria-label="Scout ${player.name}'s live build">
      <header>
        <span class="spectator-builder__rank">${String(rank + 1).padStart(2, "0")}</span>
        <span class="spectator-builder__avatar avatar--${player.avatar}">${player.initials}</span>
        <div><strong>${player.name}</strong><small>${player.buildStatus}</small></div>
        <span class="spectator-builder__hp"><b>${player.hp}</b><small>HP</small></span>
      </header>
      <div class="spectator-builder__formation">
        ${Array.from({ length: 6 }, (_, index) => spectatorBuildHeroMarkup(deployedTeam[index], index)).join("")}
      </div>
      <footer>
        <span><small>Squad Output</small><b>✦ ${totalPower}</b><b>♥ ${totalHealth}</b></span>
        <div>${traitCounts.length
          ? traitCounts.map((state) => `<i class="${state.activeTier ? "is-active" : ""}">${state.definition.name} ${state.count}</i>`).join("")
          : "<i>Traits scanning</i>"}</div>
        <em>${player.ready ? "LOCKED" : "LIVE"}</em>
      </footer>
    </article>
  `;
}

function renderSpectatorBuildBoard() {
  if (!gameState.spectating || gameState.phase !== "build") {
    spectatorBuildBoard.hidden = true;
    return;
  }

  const remainingBuilders = getAlivePlayers()
    .filter((player) => !player.isHuman)
    .sort((first, second) => second.hp - first.hp);
  spectatorBuildBoard.hidden = false;
  spectatorBuilderCount.textContent = remainingBuilders.length;
  spectatorBuildGrid.innerHTML = remainingBuilders.length
    ? remainingBuilders.map(spectatorBuilderMarkup).join("")
    : '<p class="spectator-build__empty">No remaining build feeds detected.</p>';
}

function aiTeamTargetSize() {
  return Math.min(6, gameState.round + 2);
}

function aiShopTier() {
  return Math.min(MAX_SHOP_TIER, 1 + Math.floor((gameState.round - 1) / 2));
}

const AI_BUILD_STRATEGIES = [
  { name: "Rivals Vanguard", traits: ["rivals", "brawl", "tank"] },
  { name: "Overwatch Dive", traits: ["overwatch", "dive", "dps"] },
  { name: "Realm Artillery", traits: ["paladins", "poke", "dps"] },
  { name: "Bulwark Core", traits: ["tank", "brawl"] },
  { name: "Dive Execution", traits: ["dive", "dps"] },
  { name: "Target Lock", traits: ["poke", "dps"] },
  { name: "Sustain Engine", traits: ["support", "brawl"] },
];

function getAiStrategy(aiPlayer) {
  if (!aiPlayer.aiStrategy) {
    const aiPlayers = players.filter((player) => !player.isHuman);
    const aiIndex = Math.max(0, aiPlayers.indexOf(aiPlayer));
    aiPlayer.aiStrategy = AI_BUILD_STRATEGIES[aiIndex % AI_BUILD_STRATEGIES.length];
  }

  return aiPlayer.aiStrategy;
}

function scoreCombatEffects(effects = {}) {
  const weights = {
    bonusPower: 2.7,
    bonusHealth: 1.35,
    damageReduction: 4.8,
    dodgeChance: 34,
    critChance: 30,
    critDamage: 1.5,
    firstStrikeBonus: 1.55,
    lifesteal: 24,
    onKillHeal: 1.25,
    thorns: 1.8,
    executeBonus: 1.2,
    executeThreshold: 8,
  };

  return Object.entries(effects).reduce(
    (score, [effectName, value]) => score + ((weights[effectName] || 0.7) * Number(value || 0)),
    0,
  );
}

function scoreAiTeam(team, aiPlayer) {
  const deployedTeam = team.filter(Boolean);
  const strategy = getAiStrategy(aiPlayer);
  const traitCounts = countTeamTraits(deployedTeam);
  let score = 0;

  deployedTeam.forEach((hero) => {
    const traitCombat = heroTraitCombatData(hero, deployedTeam);
    score += (hero.power * 2.15) + (hero.health * 1.25);
    score += scoreCombatEffects(hero.ability?.effects);
    score += scoreCombatEffects(traitCombat.effects);
    score += Math.max(0, (hero.level || 1) - 1) * 7;
    score += heroTraitIds(hero).filter((traitId) => strategy.traits.includes(traitId)).length * 2.4;
  });

  traitCounts.forEach((count, traitId) => {
    const state = traitState(traitId, deployedTeam);
    if (state.activeTier) score += state.activeTier.threshold * 3.5;
    if (strategy.traits.includes(traitId)) score += Math.min(6, count) * 2;
  });

  score += new Set(deployedTeam.map(heroCatalogId)).size * 1.2;
  return score;
}

function cloneAiTeam(team) {
  return team.filter(Boolean).map((hero) => createHeroInstance({ ...hero }));
}

function simulateAiRecruit(team, catalogHero) {
  const simulatedTeam = cloneAiTeam(team);
  simulatedTeam.push(createHeroInstance(catalogHero));
  mergeAiDuplicates(simulatedTeam);
  return simulatedTeam;
}

function candidateTraitProgressScore(hero, team, strategy) {
  const beforeCounts = countTeamTraits(team);
  const alreadyOwned = team.some((ownedHero) => heroCatalogId(ownedHero) === hero.id);
  let score = 0;

  heroTraitIds(hero).forEach((traitId) => {
    const beforeCount = beforeCounts.get(traitId) || 0;
    const afterCount = beforeCount + (alreadyOwned ? 0 : 1);
    const definition = traitDefinitions[traitId];
    const crossedTier = definition?.tiers?.find(
      (tier) => tier.threshold === afterCount && beforeCount < tier.threshold,
    );
    if (crossedTier) score += 12 + (crossedTier.threshold * 2.5);
    else if (!alreadyOwned) score += 2.5;
    if (strategy.traits.includes(traitId)) score += alreadyOwned ? 1.5 : 6;
  });

  return score;
}

function chooseAiHero(aiPlayer, { preferGrowth = false } = {}) {
  const maxTier = aiShopTier();
  const unlockedCandidates = heroCatalog.filter((hero) => hero.tier <= maxTier);
  const unownedCandidates = unlockedCandidates.filter(
    (hero) => !aiPlayer.team.some((ownedHero) => heroCatalogId(ownedHero) === hero.id),
  );
  const candidates = preferGrowth && unownedCandidates.length ? unownedCandidates : unlockedCandidates;
  const currentScore = scoreAiTeam(aiPlayer.team, aiPlayer);
  const strategy = getAiStrategy(aiPlayer);

  const weightedCandidates = candidates
    .map((hero) => {
      const matchingHero = aiPlayer.team.find(
        (ownedHero) => heroCatalogId(ownedHero) === hero.id && ownedHero.level < MAX_HERO_LEVEL,
      );
      const simulatedTeam = simulateAiRecruit(aiPlayer.team, hero);
      const completedMerge = simulatedTeam.length === aiPlayer.team.length;
      const mergeScore = matchingHero
        ? (completedMerge ? 18 + ((matchingHero.level || 1) * 6) : 7)
        : 0;
      return {
        hero,
        score: (scoreAiTeam(simulatedTeam, aiPlayer) - currentScore)
          + candidateTraitProgressScore(hero, aiPlayer.team, strategy)
          + mergeScore
          + (((hero.power * 2) + hero.health + scoreCombatEffects(hero.ability?.effects)) * 0.16)
          + (Math.random() * 1.8),
      };
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, Math.min(3, candidates.length));

  const selectionWindow = weightedCandidates.slice(0, Math.min(2, weightedCandidates.length));
  return createHeroInstance(selectionWindow[Math.floor(Math.random() * selectionWindow.length)].hero);
}

function mergeAiDuplicates(team) {
  let merged = true;

  while (merged) {
    merged = false;

    for (let firstIndex = 0; firstIndex < team.length; firstIndex += 1) {
      const firstHero = team[firstIndex];
      const matchIndex = team.findIndex(
        (secondHero, secondIndex) => secondIndex > firstIndex
          && heroCatalogId(secondHero) === heroCatalogId(firstHero)
          && secondHero.level === firstHero.level
          && firstHero.level < MAX_HERO_LEVEL,
      );

      if (matchIndex !== -1) {
        firstHero.level += 1;
        applyHeroLevelStats(firstHero);
        team.splice(matchIndex, 1);
        merged = true;
        break;
      }
    }
  }
}

function findBestAiUpgrade(aiPlayer) {
  const maxTier = aiShopTier();
  const currentScore = scoreAiTeam(aiPlayer.team, aiPlayer);
  const plans = [];

  heroCatalog.filter((hero) => hero.tier <= maxTier).forEach((catalogHero) => {
    const matchingCopy = aiPlayer.team.some(
      (hero) => heroCatalogId(hero) === catalogHero.id
        && hero.level === 1
        && hero.level < MAX_HERO_LEVEL,
    );

    if (matchingCopy) {
      const mergedTeam = simulateAiRecruit(aiPlayer.team, catalogHero);
      plans.push({
        type: "merge",
        hero: catalogHero,
        score: scoreAiTeam(mergedTeam, aiPlayer) - currentScore + 14,
      });
    }

    aiPlayer.team.forEach((ownedHero, index) => {
      const replacementTeam = cloneAiTeam(aiPlayer.team);
      replacementTeam[index] = createHeroInstance(catalogHero);
      plans.push({
        type: "replace",
        hero: catalogHero,
        index,
        score: scoreAiTeam(replacementTeam, aiPlayer) - currentScore,
      });
    });
  });

  return plans.sort((first, second) => second.score - first.score)[0] || null;
}

function updateAiBuildStatus(aiPlayer, targetSize, locked = false) {
  const strategy = getAiStrategy(aiPlayer);
  const activeTrait = [...countTeamTraits(aiPlayer.team).keys()]
    .map((traitId) => traitState(traitId, aiPlayer.team))
    .filter((state) => state.activeTier)
    .sort((first, second) => second.activeTier.threshold - first.activeTier.threshold)[0];

  if (locked) {
    aiPlayer.buildStatus = activeTrait
      ? `${activeTrait.definition.name} ${activeTrait.count} · locked`
      : `${strategy.name} · locked`;
    return;
  }

  aiPlayer.buildStatus = aiPlayer.team.length >= targetSize
    ? `Optimizing ${strategy.name}`
    : `${strategy.name} ${aiPlayer.team.length}/${targetSize}`;
}

function runAiBuildAction(aiPlayer) {
  if (gameState.phase !== "build" || aiPlayer.eliminated) {
    return;
  }

  const targetSize = aiTeamTargetSize();

  if (aiPlayer.team.length < targetSize) {
    aiPlayer.team.push(chooseAiHero(aiPlayer, { preferGrowth: aiPlayer.team.length < targetSize - 1 }));
    mergeAiDuplicates(aiPlayer.team);
  } else {
    const upgrade = findBestAiUpgrade(aiPlayer);

    if (upgrade?.type === "merge") {
      aiPlayer.team.push(createHeroInstance(upgrade.hero));
      mergeAiDuplicates(aiPlayer.team);
    } else if (upgrade?.type === "replace" && upgrade.score > 1.5) {
      aiPlayer.team[upgrade.index] = createHeroInstance(upgrade.hero);
    }
  }

  aiPlayer.ready = false;
  updateAiBuildStatus(aiPlayer, targetSize);
  renderLeaderboard();
  renderThreatPreview();
  renderSpectatorBuildBoard();
  checkAllPlayersReady();
}

function finalizeAiBuild(aiPlayer) {
  if (gameState.phase !== "build" || aiPlayer.eliminated) return;
  const targetSize = aiTeamTargetSize();
  let safety = 0;

  while (aiPlayer.team.length < targetSize && safety < 20) {
    aiPlayer.team.push(chooseAiHero(aiPlayer, { preferGrowth: true }));
    mergeAiDuplicates(aiPlayer.team);
    safety += 1;
  }

  aiPlayer.ready = true;
  updateAiBuildStatus(aiPlayer, targetSize, true);
  renderLeaderboard();
  renderThreatPreview();
  renderSpectatorBuildBoard();
  checkAllPlayersReady();
}

function clearAiBuildTimers() {
  aiBuildTimers.forEach((timer) => window.clearTimeout(timer));
  aiBuildTimers = [];
}

function scheduleAiBuilds() {
  clearAiBuildTimers();
  const targetSize = aiTeamTargetSize();

  players.filter((player) => !player.isHuman && !player.eliminated).forEach((aiPlayer, aiIndex) => {
    aiPlayer.ready = false;
    const strategy = getAiStrategy(aiPlayer);
    aiPlayer.buildStatus = `Planning ${strategy.name}`;
    const actions = Math.max(3, targetSize - aiPlayer.team.length + 2 + (gameState.round > 1 ? 1 : 0));
    const thinkingPace = 0.86 + ((aiIndex % 7) * 0.08) + (Math.random() * 0.06);
    const openingThinkTime = 3_200 + (Math.random() * 4_200);
    const actionThinkTime = (2_600 + (Math.random() * 1_000)) * thinkingPace;

    for (let actionIndex = 0; actionIndex < actions; actionIndex += 1) {
      const delay = openingThinkTime
        + (actionIndex * actionThinkTime)
        + (Math.random() * 220);
      aiBuildTimers.push(window.setTimeout(() => runAiBuildAction(aiPlayer), delay));
    }

    const lockDelay = openingThinkTime
      + (actions * actionThinkTime)
      + 1_600
      + (Math.random() * 3_200);
    aiBuildTimers.push(window.setTimeout(() => finalizeAiBuild(aiPlayer), lockDelay));
  });

  renderLeaderboard();
  renderThreatPreview();
  renderSpectatorBuildBoard();
}

function completeAiBuilds() {
  clearAiBuildTimers();
  const targetSize = aiTeamTargetSize();

  players.filter((player) => !player.isHuman && !player.eliminated).forEach((aiPlayer) => {
    let safety = 0;
    while (aiPlayer.team.length < targetSize && safety < 20) {
      aiPlayer.team.push(chooseAiHero(aiPlayer, { preferGrowth: true }));
      mergeAiDuplicates(aiPlayer.team);
      safety += 1;
    }
    aiPlayer.ready = true;
    updateAiBuildStatus(aiPlayer, targetSize, true);
  });

  gameState.pairings.flat().filter((player) => player.isGhost).forEach((ghostPlayer) => {
    const sourcePlayer = players.find((player) => player.id === ghostPlayer.ghostSourceId);

    if (sourcePlayer) {
      ghostPlayer.team = sourcePlayer.team.map((hero) => ({ ...hero }));
      ghostPlayer.hp = sourcePlayer.hp;
    }
  });

  renderLeaderboard();
  renderThreatPreview();
  renderSpectatorBuildBoard();
}

function prepareRoundPairings() {
  const alivePlayers = getAlivePlayers();
  const humanPlayer = alivePlayers.find((player) => player.isHuman);
  const remainingPlayers = shuffleArray(alivePlayers.filter((player) => !player.isHuman));
  const pairings = [];

  if (humanPlayer && remainingPlayers.length) {
    pairings.push([humanPlayer, remainingPlayers.shift()]);
  }

  while (remainingPlayers.length >= 2) {
    pairings.push([remainingPlayers.shift(), remainingPlayers.shift()]);
  }

  if (remainingPlayers.length === 1) {
    const soloPlayer = remainingPlayers.shift();
    const ghostSource = shuffleArray(alivePlayers.filter((player) => player.id !== soloPlayer.id))[0];
    pairings.push([
      soloPlayer,
      {
        ...ghostSource,
        id: `ghost-${gameState.round}-${ghostSource.id}`,
        name: `${ghostSource.name} Echo`,
        team: ghostSource.team.map((hero) => ({ ...hero })),
        ghostSourceId: ghostSource.id,
        isGhost: true,
        isHuman: false,
      },
    ]);
  }

  gameState.pairings = pairings;
  renderThreatPreview();
}

function updateHud() {
  const humanPlayer = getHumanPlayer();
  const playerCanBuild = gameState.buildPhaseActive && !humanPlayer.eliminated;
  creditsElement.textContent = gameState.credits;
  unitCountElement.textContent = gameState.team.filter(Boolean).length;
  sidelineCountElement.textContent = gameState.bench.filter(Boolean).length;
  shopTierElement.textContent = String(gameState.shopTier).padStart(2, "0");
  playerHealthElement.textContent = humanPlayer.hp;
  roundValueElement.textContent = String(gameState.round).padStart(2, "0");

  shopHeroes.forEach((hero) => {
    const isAvailable = hero.card.dataset.status === "available";
    const cannotAfford = isAvailable && hero.cost > gameState.credits;
    hero.card.classList.toggle("shop-card--locked", cannotAfford);
    const buyButton = hero.card.querySelector(".shop-card__buy");
    buyButton.disabled = !playerCanBuild;
    buyButton.setAttribute("aria-disabled", String(cannotAfford || !playerCanBuild));
  });

  freezeShopButton.disabled = !playerCanBuild;
  freezeShopButton.classList.toggle("freeze-shop-button--active", gameState.shopFrozen);
  freezeShopButton.setAttribute("aria-pressed", String(gameState.shopFrozen));
  freezeShopButton.setAttribute("aria-disabled", String(freezeShopButton.disabled));
  freezeShopButton.setAttribute(
    "aria-label",
    gameState.shopFrozen
      ? "Unfreeze the shop. Its offers will refresh next round."
      : "Freeze the shop. Its offers will remain for the next round.",
  );
  freezeShopLabel.textContent = gameState.shopFrozen ? "Frozen" : "Freeze";
  freezeShopHint.textContent = gameState.shopFrozen ? "Saved next round" : "Keep next round";
  shopDeck.classList.toggle("shop-deck--frozen", gameState.shopFrozen);
  shopRailStatus.textContent = gameState.shopFrozen ? "Stock frozen" : "Stock refreshed";
  shopCards.forEach((card) => {
    card.classList.toggle("shop-card--frozen", gameState.shopFrozen && card.dataset.status !== "deployed");
  });

  rerollButton.disabled = gameState.shopFrozen || gameState.credits < 1 || !playerCanBuild;
  rerollButton.setAttribute("aria-disabled", String(rerollButton.disabled));

  const isMaxTier = gameState.shopTier >= MAX_SHOP_TIER;
  const upgradeCost = SHOP_UPGRADE_COSTS[gameState.shopTier];
  const cannotAffordUpgrade = !isMaxTier && gameState.credits < upgradeCost;
  upgradeShopButton.disabled = isMaxTier || !playerCanBuild;
  upgradeShopButton.classList.toggle("upgrade-button--locked", cannotAffordUpgrade);
  upgradeShopButton.setAttribute(
    "aria-disabled",
    String(upgradeShopButton.disabled || cannotAffordUpgrade),
  );
  upgradeShopCostElement.textContent = isMaxTier ? "MAX" : `◆ ${upgradeCost}`;
  upgradeShopHintElement.textContent = isMaxTier
    ? "Maximum shop tier reached"
    : `Unlock tier ${gameState.shopTier + 1} heroes`;
  renderReadyButton();
}

function heroInspectContent(hero) {
  const ability = hero.ability;
  const level = hero.level || 1;
  const nextLevel = Math.min(MAX_HERO_LEVEL, level + 1);
  const nextMultiplier = LEVEL_STAT_MULTIPLIERS[nextLevel - 1];
  const nextPower = Math.round((hero.basePower ?? hero.power) * nextMultiplier);
  const nextHealth = Math.round((hero.baseHealth ?? hero.health) * nextMultiplier);
  const traitMarkup = heroTraitIds(hero).map((traitId) => {
    const trait = traitDefinitions[traitId];
    return trait
      ? `<i class="hero-inspect__trait hero-inspect__trait--${trait.category}" title="${trait.ability}: ${trait.description}">${trait.name}</i>`
      : "";
  }).join("");

  return `
    <span class="hero-inspect__eyebrow">Hero Dossier // Level ${level}</span>
    <strong class="hero-inspect__name">${hero.name}</strong>
    <span class="hero-inspect__stats">
      <i><b>✦</b> ${hero.power} Power</i>
      <i><b>♥</b> ${hero.health} Health</i>
    </span>
    <span class="hero-inspect__level-note">${level >= MAX_HERO_LEVEL ? "Maximum level reached" : `Next: ${nextPower} power / ${nextHealth} health`}</span>
    <span class="hero-inspect__traits">${traitMarkup}</span>
    <span class="hero-inspect__ability-type">${ability?.type || "Standard"} Ability</span>
    <strong class="hero-inspect__ability-name">${ability?.name || "Standard Attack"}</strong>
    <span class="hero-inspect__description">${ability?.description || "Attacks the enemy directly."}</span>
  `;
}

function hideHeroInfoPopover() {
  activeHeroInfoAnchor = null;
  window.cancelAnimationFrame(heroInfoPositionFrame);
  heroInfoPositionFrame = null;
  heroInfoPopover.classList.remove("hero-info-popover--visible");
  heroInfoPopover.hidden = true;
  heroInfoPopover.setAttribute("aria-hidden", "true");
}

function positionHeroInfoPopover() {
  if (!activeHeroInfoAnchor?.isConnected || heroInfoPopover.hidden) {
    hideHeroInfoPopover();
    return;
  }

  const anchorRect = activeHeroInfoAnchor.getBoundingClientRect();
  const popoverRect = heroInfoPopover.getBoundingClientRect();

  if (anchorRect.bottom < 0 || anchorRect.top > window.innerHeight || anchorRect.right < 0 || anchorRect.left > window.innerWidth) {
    hideHeroInfoPopover();
    return;
  }

  const viewportPadding = 12;
  const gap = 14;
  const availableRight = window.innerWidth - anchorRect.right;
  const availableLeft = anchorRect.left;
  const availableTop = anchorRect.top;
  let placement = "right";
  let left = anchorRect.right + gap;
  let top = anchorRect.top + ((anchorRect.height - popoverRect.height) / 2);

  if (availableRight < popoverRect.width + gap && availableLeft >= popoverRect.width + gap) {
    placement = "left";
    left = anchorRect.left - popoverRect.width - gap;
  } else if (availableRight < popoverRect.width + gap && availableLeft < popoverRect.width + gap) {
    if (availableTop >= popoverRect.height + gap) {
      placement = "top";
      left = anchorRect.left + ((anchorRect.width - popoverRect.width) / 2);
      top = anchorRect.top - popoverRect.height - gap;
    } else {
      placement = "bottom";
      left = anchorRect.left + ((anchorRect.width - popoverRect.width) / 2);
      top = anchorRect.bottom + gap;
    }
  }

  left = Math.min(
    window.innerWidth - popoverRect.width - viewportPadding,
    Math.max(viewportPadding, left),
  );
  top = Math.min(
    window.innerHeight - popoverRect.height - viewportPadding,
    Math.max(viewportPadding, top),
  );

  heroInfoPopover.dataset.placement = placement;
  heroInfoPopover.style.left = `${Math.round(left)}px`;
  heroInfoPopover.style.top = `${Math.round(top)}px`;
}

function queueHeroInfoPosition() {
  window.cancelAnimationFrame(heroInfoPositionFrame);
  heroInfoPositionFrame = window.requestAnimationFrame(() => {
    heroInfoPositionFrame = null;
    positionHeroInfoPopover();
  });
}

function showHeroInfoPopover(anchor) {
  const source = anchor?.querySelector(".hero-inspect");

  if (!source || window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
    return;
  }

  activeHeroInfoAnchor = anchor;
  heroInfoPopoverContent.innerHTML = source.innerHTML;
  heroInfoPopover.style.setProperty(
    "--accent",
    getComputedStyle(anchor).getPropertyValue("--accent").trim() || "#5fe7ff",
  );
  heroInfoPopover.hidden = false;
  heroInfoPopover.setAttribute("aria-hidden", "false");
  heroInfoPopover.classList.remove("hero-info-popover--visible");
  positionHeroInfoPopover();
  window.requestAnimationFrame(() => {
    heroInfoPopover.classList.add("hero-info-popover--visible");
    window.requestAnimationFrame(positionHeroInfoPopover);
  });
}

function closestHeroInfoCard(target) {
  return target instanceof Element ? target.closest(".shop-card, .hero-card") : null;
}

function setShopCardHero(card, catalogHero) {
  if (activeHeroInfoAnchor === card) {
    hideHeroInfoPopover();
  }

  const shopSlotId = card.dataset.shopId;
  const buyButton = card.querySelector(".shop-card__buy");
  const traitNames = heroTraitIds(catalogHero)
    .map((traitId) => traitDefinitions[traitId]?.name)
    .filter(Boolean)
    .join(", ");

  card.className = `shop-card shop-card--${catalogHero.universe} shop-card--rerolling`;
  card.dataset.heroId = catalogHero.id;
  card.dataset.name = catalogHero.name;
  card.dataset.universe = catalogHero.universe;
  card.dataset.image = catalogHero.image;
  card.dataset.logo = catalogHero.logo;
  card.dataset.power = catalogHero.power;
  card.dataset.health = catalogHero.health;
  card.dataset.cost = catalogHero.cost;
  card.dataset.tier = catalogHero.tier;
  card.dataset.status = "available";
  card.draggable = false;
  card.removeAttribute("aria-pressed");
  delete card.dataset.suppressClick;
  card.setAttribute(
    "aria-label",
    `${catalogHero.name}, tier ${catalogHero.tier}, cost ${catalogHero.cost} credits. Traits: ${traitNames}${catalogHero.ability ? `. Ability: ${catalogHero.ability.name}. ${catalogHero.ability.description}` : ""}`,
  );

  const heroImage = card.querySelector("img:not(.universe-badge)");
  heroImage.src = catalogHero.image;
  heroImage.alt = catalogHero.name;
  card.querySelector(".universe-badge").src = catalogHero.logo;
  let abilityBadge = card.querySelector(".shop-card__ability");

  if (!abilityBadge) {
    abilityBadge = document.createElement("span");
    abilityBadge.className = "shop-card__ability";
    card.insertBefore(abilityBadge, buyButton);
  }

  abilityBadge.hidden = !catalogHero.ability;
  abilityBadge.textContent = catalogHero.ability ? "A" : "";
  abilityBadge.title = catalogHero.ability
    ? `${catalogHero.ability.name} — ${catalogHero.ability.description}`
    : "";
  abilityBadge.setAttribute(
    "aria-label",
    catalogHero.ability
      ? `${catalogHero.ability.name}: ${catalogHero.ability.description}`
      : "No ability",
  );
  const tooltipId = `shop-hero-inspect-${shopSlotId}`;
  let heroInspect = card.querySelector(".hero-inspect");

  if (!heroInspect) {
    heroInspect = document.createElement("div");
    heroInspect.className = "hero-inspect hero-inspect--shop";
    heroInspect.setAttribute("role", "tooltip");
    card.insertBefore(heroInspect, buyButton);
  }

  heroInspect.id = tooltipId;
  heroInspect.innerHTML = heroInspectContent(catalogHero);
  card.setAttribute("aria-describedby", tooltipId);
  buyButton.querySelector("span").textContent = "Buy";
  buyButton.querySelector("strong").innerHTML = `<i>◆</i> ${catalogHero.cost}`;

  shopHeroes.set(shopSlotId, {
    ...catalogHero,
    catalogId: catalogHero.id,
    id: shopSlotId,
    basePower: catalogHero.power,
    baseHealth: catalogHero.health,
    level: 1,
    card,
  });

  window.setTimeout(() => card.classList.remove("shop-card--rerolling"), 260);
}

function shuffledHeroes(excludedIds, amount) {
  const unlockedHeroes = heroCatalog.filter((hero) => hero.tier <= gameState.shopTier);
  let candidates = unlockedHeroes.filter((hero) => !excludedIds.has(hero.id));

  if (candidates.length < amount) {
    candidates = [...unlockedHeroes];
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }

  return candidates.slice(0, amount);
}

function rerollShop() {
  const refreshableCards = shopCards.filter((card) => card.dataset.status !== "purchased");

  if (!gameState.buildPhaseActive) {
    window.PRWAudio?.play("error");
    announce("The build phase has ended.");
    return;
  }

  if (gameState.shopFrozen) {
    window.PRWAudio?.play("error");
    announce("Unfreeze the shop before rerolling it.");
    return;
  }

  if (gameState.credits < 1) {
    window.PRWAudio?.play("error");
    announce("You need 1 credit to reroll the shop.");
    return;
  }

  if (!refreshableCards.length) {
    window.PRWAudio?.play("error");
    announce("Deploy a purchased hero before rerolling its shop slot.");
    return;
  }

  const excludedIds = new Set([
    ...[...shopHeroes.values()].map((hero) => hero.catalogId),
  ]);
  const newHeroes = shuffledHeroes(excludedIds, refreshableCards.length);

  markHumanNotReady();
  gameState.credits -= 1;
  refreshableCards.forEach((card, index) => setShopCardHero(card, newHeroes[index]));
  window.PRWAudio?.play("reroll");
  updateHud();
  announce(`Shop rerolled for 1 credit. ${refreshableCards.length} new heroes available.`);
}

function toggleShopFreeze() {
  if (!gameState.buildPhaseActive) {
    window.PRWAudio?.play("error");
    announce("The shop can only be frozen during the build phase.");
    return;
  }

  markHumanNotReady();
  gameState.shopFrozen = !gameState.shopFrozen;
  window.PRWAudio?.play(gameState.shopFrozen ? "freeze" : "unfreeze");
  updateHud();
  announce(
    gameState.shopFrozen
      ? "Shop frozen. These offers will remain for the next build phase."
      : "Shop unfrozen. Its offers will refresh next round.",
  );
}

function upgradeShopTier() {
  if (!gameState.buildPhaseActive) {
    window.PRWAudio?.play("error");
    announce("The build phase has ended.");
    return;
  }

  if (gameState.shopTier >= MAX_SHOP_TIER) {
    window.PRWAudio?.play("error");
    announce("The shop is already at maximum tier.");
    return;
  }

  const upgradeCost = SHOP_UPGRADE_COSTS[gameState.shopTier];

  if (gameState.credits < upgradeCost) {
    window.PRWAudio?.play("error");
    upgradeShopButton.classList.remove("upgrade-button--denied");
    void upgradeShopButton.offsetWidth;
    upgradeShopButton.classList.add("upgrade-button--denied");
    announce(`You need ${upgradeCost} credits to upgrade the shop.`);
    return;
  }

  markHumanNotReady();
  gameState.credits -= upgradeCost;
  gameState.shopTier += 1;
  window.PRWAudio?.play("upgrade");
  updateHud();
  announce(`Shop upgraded to tier ${gameState.shopTier}. Stronger heroes can now appear on rerolls.`);
}

function formatBuildTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function combatHeroMarkup(hero, index, team) {
  const abilityName = hero.ability?.name || "Standard Attack";
  const level = hero.level || 1;
  const traitData = heroTraitCombatData(hero, team);
  const activeTraitNames = traitData.traitIds
    .map((traitId) => traitDefinitions[traitId]?.name)
    .filter(Boolean);

  return `
    <figure class="combat-unit" data-combat-index="${index}" data-hero-name="${hero.name}" style="--unit-delay: ${index * 90}ms" title="${abilityName}${hero.ability ? ` — ${hero.ability.description}` : ""}">
      <span class="combat-unit__portrait"><img src="${hero.image}" alt="${hero.name}"><i></i></span>
      <span class="combat-unit__level">LV ${level}</span>
      ${activeTraitNames.length ? `<span class="combat-unit__traits">${activeTraitNames.join(" · ")}</span>` : ""}
      <span class="combat-unit__health" aria-label="${hero.health} health"><i style="width: 100%"></i><b>${hero.health}</b></span>
      <span class="combat-unit__charge" aria-hidden="true"><i></i></span>
      <span class="combat-unit__reticle" aria-hidden="true"><i></i></span>
      <figcaption><strong>${hero.name}</strong><em>${abilityName}</em><span>✦ ${hero.power} · ♥ ${hero.health}</span></figcaption>
    </figure>
  `;
}

function renderCombatTeam(container, team) {
  const deployedHeroes = team.filter(Boolean);
  container.innerHTML = deployedHeroes.length
    ? deployedHeroes.map((hero, index) => combatHeroMarkup(hero, index, team)).join("")
    : "<div class=\"combat-team__empty\">No heroes deployed</div>";
}

function combatBuffIndicators(effects = {}) {
  const indicators = [];

  if (effects.bonusPower) indicators.push({ type: "power", text: `+${effects.bonusPower} POWER` });
  if (effects.bonusHealth) indicators.push({ type: "health", text: `+${effects.bonusHealth} MAX HP` });
  if (effects.critChance) indicators.push({ type: "critical", text: `+${Math.round(effects.critChance * 100)}% CRIT` });
  if (effects.dodgeChance) indicators.push({ type: "dodge", text: `+${Math.round(effects.dodgeChance * 100)}% EVADE` });
  if (effects.damageReduction) indicators.push({ type: "guard", text: `-${effects.damageReduction} DMG TAKEN` });
  if (effects.lifesteal) indicators.push({ type: "healing", text: `${Math.round(effects.lifesteal * 100)}% LIFESTEAL` });
  if (effects.thorns) indicators.push({ type: "retaliation", text: `${effects.thorns} REFLECT` });

  return indicators;
}

function combatantRecap(fighter) {
  return {
    catalogId: heroCatalogId(fighter),
    name: fighter.name,
    image: fighter.image,
    universe: fighter.universe,
    level: fighter.level || 1,
    power: fighter.power,
    maxHealth: fighter.maxHealth,
    remainingHealth: Math.max(0, fighter.currentHealth),
    survived: fighter.currentHealth > 0,
    abilityName: fighter.ability?.name || "Standard Attack",
    stats: { ...fighter.combatStats },
  };
}

function battleRecapTeams(firstSquad, secondSquad) {
  return {
    first: firstSquad.map(combatantRecap),
    second: secondSquad.map(combatantRecap),
  };
}

function simulateBattle(firstPlayer, secondPlayer) {
  const createFighter = (hero, team, combatIndex, combatSide) => {
    const traitData = heroTraitCombatData(hero, team);
    const effects = combineCombatEffects(hero.ability?.effects, traitData.effects);
    const maxHealth = hero.health + (effects.bonusHealth || 0);
    const openingBuffs = combatBuffIndicators(effects);

    return {
      ...hero,
      power: hero.power + (effects.bonusPower || 0),
      combatEffects: effects,
      traitAbilities: traitData.abilities,
      activeTraitIds: traitData.traitIds,
      maxHealth,
      currentHealth: maxHealth,
      attacksMade: 0,
      combatIndex,
      combatSide,
      combatStats: {
        attacks: 0,
        damageDealt: 0,
        damageTaken: 0,
        healing: 0,
        eliminations: 0,
        criticals: 0,
        dodges: 0,
        abilityProcs: 0,
      },
      openingBuffs,
      openingBuffSources: [hero.ability?.name, ...traitData.abilities].filter(Boolean),
    };
  };
  const firstSquad = firstPlayer.team.filter(Boolean).map((hero, index) => createFighter(hero, firstPlayer.team, index, "first"));
  const secondSquad = secondPlayer.team.filter(Boolean).map((hero, index) => createFighter(hero, secondPlayer.team, index, "second"));
  const events = [];
  const openingBuffs = {
    first: firstSquad.map((hero) => ({
      name: hero.name,
      power: hero.power,
      maxHealth: hero.maxHealth,
      indicators: hero.openingBuffs,
      sources: hero.openingBuffSources,
    })),
    second: secondSquad.map((hero) => ({
      name: hero.name,
      power: hero.power,
      maxHealth: hero.maxHealth,
      indicators: hero.openingBuffs,
      sources: hero.openingBuffSources,
    })),
  };

  if (!firstSquad.length && !secondSquad.length) {
    const firstWins = Math.random() >= 0.5;
    return {
      winner: firstWins ? firstPlayer : secondPlayer,
      loser: firstWins ? secondPlayer : firstPlayer,
      survivors: 0,
      events,
      openingBuffs,
      combatants: battleRecapTeams(firstSquad, secondSquad),
    };
  }

  if (!firstSquad.length || !secondSquad.length) {
    return {
      winner: firstSquad.length ? firstPlayer : secondPlayer,
      loser: firstSquad.length ? secondPlayer : firstPlayer,
      survivors: Math.max(firstSquad.length, secondSquad.length),
      events,
      openingBuffs,
      combatants: battleRecapTeams(firstSquad, secondSquad),
    };
  }

  let firstFront = 0;
  let secondFront = 0;
  let firstAttacks = Math.random() >= 0.5;
  let turns = 0;

  while (firstFront < firstSquad.length && secondFront < secondSquad.length && turns < 180) {
    const attacker = firstAttacks ? firstSquad[firstFront] : secondSquad[secondFront];
    const defender = firstAttacks ? secondSquad[secondFront] : firstSquad[firstFront];
    const attackerEffects = attacker.combatEffects || {};
    const defenderEffects = defender.combatEffects || {};
    const abilityNames = [];
    const dodged = Math.random() < Math.min(0.65, defenderEffects.dodgeChance || 0);
    const critical = !dodged && Math.random() < Math.min(0.75, 0.14 + (attackerEffects.critChance || 0));
    const firstStrikeBonus = attacker.attacksMade === 0 ? (attackerEffects.firstStrikeBonus || 0) : 0;
    const executeBonus = defender.currentHealth / defender.maxHealth <= (attackerEffects.executeThreshold || 0)
      ? (attackerEffects.executeBonus || 0)
      : 0;
    const criticalBonus = critical ? 3 + (attackerEffects.critDamage || 0) : 0;
    let damage = 0;

    attacker.combatStats.attacks += 1;

    if (dodged) {
      defender.combatStats.dodges += 1;
      defender.combatStats.abilityProcs += 1;
      abilityNames.push(defender.ability?.name);
      abilityNames.push(...defender.traitAbilities);
    } else {
      damage = Math.max(
        1,
        attacker.power
          + criticalBonus
          + firstStrikeBonus
          + executeBonus
          + Math.floor(Math.random() * 3)
          - Math.floor(defender.maxHealth / 6)
          - (defenderEffects.damageReduction || 0),
      );
      defender.currentHealth -= damage;
      attacker.combatStats.damageDealt += damage;
      defender.combatStats.damageTaken += damage;

      if (critical) {
        attacker.combatStats.criticals += 1;
      }

      if (firstStrikeBonus || executeBonus || (critical && attackerEffects.critChance)) {
        attacker.combatStats.abilityProcs += 1;
        abilityNames.push(attacker.ability?.name);
        abilityNames.push(...attacker.traitAbilities);
      }
    }

    const defenderDefeated = defender.currentHealth <= 0;
    let healing = 0;
    let retaliationDamage = 0;

    if (damage > 0 && attackerEffects.lifesteal && attacker.currentHealth > 0) {
      healing = Math.min(
        attacker.maxHealth - attacker.currentHealth,
        Math.max(1, Math.ceil(damage * attackerEffects.lifesteal)),
      );
      attacker.currentHealth += healing;
      attacker.combatStats.healing += healing;

      if (healing > 0) {
        attacker.combatStats.abilityProcs += 1;
        abilityNames.push(attacker.ability?.name);
        abilityNames.push(...attacker.traitAbilities);
      }
    }

    if (damage > 0 && defenderEffects.thorns) {
      retaliationDamage = defenderEffects.thorns;
      attacker.currentHealth -= retaliationDamage;
      defender.combatStats.damageDealt += retaliationDamage;
      attacker.combatStats.damageTaken += retaliationDamage;
      defender.combatStats.abilityProcs += 1;
      abilityNames.push(defender.ability?.name);
      abilityNames.push(...defender.traitAbilities);
    }

    if (defenderDefeated && attackerEffects.onKillHeal && attacker.currentHealth > 0) {
      const knockoutHealing = Math.min(
        attacker.maxHealth - attacker.currentHealth,
        attackerEffects.onKillHeal,
      );
      attacker.currentHealth += knockoutHealing;
      healing += knockoutHealing;
      attacker.combatStats.healing += knockoutHealing;

      if (knockoutHealing > 0) {
        attacker.combatStats.abilityProcs += 1;
        abilityNames.push(attacker.ability?.name);
        abilityNames.push(...attacker.traitAbilities);
      }
    }

    attacker.attacksMade += 1;
    const attackerDefeated = attacker.currentHealth <= 0;

    if (defenderDefeated) {
      attacker.combatStats.eliminations += 1;
    }

    if (events.length < 48) {
      events.push({
        attackerSide: firstAttacks ? "first" : "second",
        attackerIndex: firstAttacks ? firstFront : secondFront,
        attackerName: attacker.name,
        defenderSide: firstAttacks ? "second" : "first",
        defenderIndex: firstAttacks ? secondFront : firstFront,
        defenderName: defender.name,
        damage,
        remainingHealth: Math.max(0, defender.currentHealth),
        maxHealth: defender.maxHealth,
        defeated: defenderDefeated,
        critical,
        dodged,
        healing,
        retaliationDamage,
        attackerRemainingHealth: Math.max(0, attacker.currentHealth),
        attackerMaxHealth: attacker.maxHealth,
        attackerDefeated,
        abilityNames: [...new Set(abilityNames.filter(Boolean))],
      });
    }

    if (firstAttacks) {
      if (defenderDefeated) {
        secondFront += 1;
      }

      if (attackerDefeated) {
        firstFront += 1;
      }
    } else {
      if (defenderDefeated) {
        firstFront += 1;
      }

      if (attackerDefeated) {
        secondFront += 1;
      }
    }

    firstAttacks = !firstAttacks;
    turns += 1;
  }

  const firstEliminated = firstFront >= firstSquad.length;
  const secondEliminated = secondFront >= secondSquad.length;
  const firstWon = firstEliminated && secondEliminated
    ? Math.random() >= 0.5
    : secondEliminated;
  const winningSquad = firstWon ? firstSquad : secondSquad;

  return {
    winner: firstWon ? firstPlayer : secondPlayer,
    loser: firstWon ? secondPlayer : firstPlayer,
    survivors: winningSquad.filter((hero) => hero.currentHealth > 0).length,
    events,
    openingBuffs,
    combatants: battleRecapTeams(firstSquad, secondSquad),
  };
}

function calculateCombatDamage(survivors) {
  return Math.min(35, 8 + (gameState.round * 2) + (survivors * 3));
}

function recapTeamTotals(combatants = []) {
  return combatants.reduce((totals, hero) => ({
    damage: totals.damage + hero.stats.damageDealt,
    healing: totals.healing + hero.stats.healing,
    eliminations: totals.eliminations + hero.stats.eliminations,
  }), { damage: 0, healing: 0, eliminations: 0 });
}

function combatRecapHeroMarkup(hero, highestDamage) {
  const stats = hero.stats;
  const topDamageClass = stats.damageDealt === highestDamage && highestDamage > 0
    ? " combat-recap-hero--mvp"
    : "";

  return `
    <article class="combat-recap-hero${topDamageClass}${hero.survived ? "" : " combat-recap-hero--defeated"}">
      <div class="combat-recap-hero__identity">
        <span><img src="${hero.image}" alt="${hero.name}"><i>${hero.survived ? "UP" : "KO"}</i></span>
        <div><strong>${hero.name}</strong><small>LV ${hero.level} // ${hero.abilityName}</small><em>${stats.attacks} attacks · ${stats.abilityProcs} ability procs</em></div>
      </div>
      <div class="combat-recap-hero__stats">
        <span data-stat="damage"><b>${stats.damageDealt}</b><small>DMG</small></span>
        <span><b>${stats.damageTaken}</b><small>TAKEN</small></span>
        <span data-stat="healing"><b>${stats.healing}</b><small>HEAL</small></span>
        <span data-stat="ko"><b>${stats.eliminations}</b><small>KO</small></span>
        <span><b>${stats.criticals}</b><small>CRIT</small></span>
        <span><b>${stats.dodges}</b><small>EVADE</small></span>
      </div>
      <div class="combat-recap-hero__survival"><i style="--survival: ${(hero.remainingHealth / Math.max(1, hero.maxHealth)) * 100}%"></i><span>${Math.ceil(hero.remainingHealth)} / ${hero.maxHealth} HP</span></div>
    </article>
  `;
}

function combatRecapTeamMarkup(result, side) {
  const combatants = result.combatants?.[side] || [];
  const playerName = side === "first" ? result.firstPlayerName : result.secondPlayerName;
  const playerId = side === "first" ? result.firstPlayerId : result.secondPlayerId;
  const won = result.winner.id === playerId;
  const totals = recapTeamTotals(combatants);
  const highestDamage = Math.max(0, ...combatants.map((hero) => hero.stats.damageDealt));

  return `
    <section class="combat-recap-team${won ? " combat-recap-team--winner" : " combat-recap-team--loser"}">
      <header>
        <div><small>${won ? "Round Winner" : "Round Defeat"}</small><h3>${playerName}</h3></div>
        <span><b>${totals.damage}</b> team damage</span>
        <span><b>${totals.healing}</b> healing</span>
        <span><b>${totals.eliminations}</b> eliminations</span>
      </header>
      <div class="combat-recap-team__heroes">
        ${combatants.length
          ? combatants.map((hero) => combatRecapHeroMarkup(hero, highestDamage)).join("")
          : '<p class="combat-recap-team__empty">No heroes were deployed.</p>'}
      </div>
    </section>
  `;
}

function renderCombatRecap(result) {
  if (!result) return;
  combatRecapSubtitle.textContent = `Round ${String(gameState.round).padStart(2, "0")} // ${result.firstPlayerName} vs ${result.secondPlayerName} // ${result.winner.name} won`;
  combatRecapTeams.innerHTML = ["first", "second"]
    .map((side) => combatRecapTeamMarkup(result, side))
    .join("");
}

function openCombatRecap() {
  const result = gameState.viewedCombatResult;
  if (!result) return;

  renderCombatRecap(result);
  window.clearTimeout(nextRoundTimeout);
  nextRoundTimeout = null;
  gameState.recapPausedRound = gameState.phase === "combat";
  combatRecap.hidden = false;
  combatRecap.setAttribute("aria-hidden", "false");
  document.body.classList.add("intel-overlay-open");
  combatRecap.querySelector(".intel-close")?.focus();
  window.PRWAudio?.play("modalOpen");
  announce("Combat recap opened. Per-hero round statistics are available.");
}

function closeCombatRecap({ continueMatch = false } = {}) {
  if (combatRecap.hidden) return;
  combatRecap.hidden = true;
  combatRecap.setAttribute("aria-hidden", "true");
  document.body.classList.remove("intel-overlay-open");
  window.PRWAudio?.play("modalClose");

  if (gameState.recapPausedRound && gameState.phase === "combat") {
    nextRoundTimeout = window.setTimeout(completeCombatRound, continueMatch ? 150 : 2_500);
  }

  gameState.recapPausedRound = false;
  combatRecapButton.focus();
}

function getCombatUnit(side, unitIndex, result) {
  const teamContainer = side === "first" ? playerCombatTeam : enemyCombatTeam;
  return teamContainer.querySelector(`[data-combat-index="${unitIndex}"]`);
}

function setCombatUnitHealth(unit, currentHealth, maxHealth) {
  const healthBar = unit?.querySelector(".combat-unit__health i");
  const healthValue = unit?.querySelector(".combat-unit__health b");
  const healthContainer = unit?.querySelector(".combat-unit__health");
  const safeCurrentHealth = Math.max(0, currentHealth);
  const healthPercent = maxHealth > 0 ? (safeCurrentHealth / maxHealth) * 100 : 0;

  if (healthBar) {
    healthBar.style.width = `${healthPercent}%`;
  }

  if (healthValue) {
    healthValue.textContent = Math.ceil(safeCurrentHealth);
  }

  if (healthContainer) {
    healthContainer.setAttribute("aria-label", `${Math.ceil(safeCurrentHealth)} of ${maxHealth} health`);
  }

  unit?.classList.toggle("combat-unit--danger", healthPercent > 0 && healthPercent <= 30);
}

function combatEffectPoint(unit) {
  const layerBounds = combatFxLayer.getBoundingClientRect();
  const unitBounds = unit.getBoundingClientRect();

  return {
    x: unitBounds.left - layerBounds.left + (unitBounds.width / 2),
    y: unitBounds.top - layerBounds.top + (unitBounds.height / 2),
  };
}

function removeCombatEffect(effect, delay = COMBAT_EVENT_DURATION) {
  window.setTimeout(() => effect.remove(), delay);
}

function spawnFloatingCombatText(unit, text, variant) {
  if (!unit || !combatFxLayer) {
    return;
  }

  const point = combatEffectPoint(unit);
  const floatingText = document.createElement("span");
  floatingText.className = `combat-floating-text combat-floating-text--${variant}`;
  floatingText.textContent = text;
  floatingText.style.left = `${point.x}px`;
  floatingText.style.top = `${point.y}px`;
  combatFxLayer.append(floatingText);
  removeCombatEffect(floatingText, 900);
}

function showCombatOpeningBuffs(result) {
  const buffEntries = ["first", "second"].flatMap((side) => (
    (result?.openingBuffs?.[side] || []).map((buff, unitIndex) => ({ side, unitIndex, buff }))
  )).filter(({ buff }) => buff.indicators.length);

  if (!buffEntries.length) {
    return false;
  }

  combatFeed.innerHTML = "<strong>Passives online.</strong> Hero abilities and active traits are enhancing combat stats.";
  window.PRWAudio?.play("upgrade");

  buffEntries.forEach(({ side, unitIndex, buff }, entryIndex) => {
    const unit = getCombatUnit(side, unitIndex, result);

    if (!unit) {
      return;
    }

    window.setTimeout(() => {
      const statLine = unit.querySelector("figcaption > span");
      const buffStack = document.createElement("span");
      const sourceLabel = [...new Set(buff.sources)].slice(0, 2).join(" + ");

      buffStack.className = "combat-unit__buff-stack";
      buffStack.innerHTML = `
        ${sourceLabel ? `<small>${sourceLabel}</small>` : ""}
        ${buff.indicators.map((indicator) => `<b class="combat-unit__buff combat-unit__buff--${indicator.type}">${indicator.text}</b>`).join("")}
      `;
      unit.querySelector(".combat-unit__buff-stack")?.remove();
      unit.append(buffStack);
      unit.classList.add("combat-unit--buffed");
      setCombatUnitHealth(unit, buff.maxHealth, buff.maxHealth);

      if (statLine) {
        statLine.innerHTML = `<i class="combat-unit__power-stat">✦ ${buff.power}</i><i class="combat-unit__health-stat">♥ ${buff.maxHealth}</i>`;
      }

      window.setTimeout(() => unit.classList.remove("combat-unit--buffed"), 1050);
      removeCombatEffect(buffStack, 1350);
    }, entryIndex * 90);
  });

  return true;
}

function spawnCombatProjectile(attackerUnit, defenderUnit, combatEvent) {
  if (!attackerUnit || !defenderUnit || !combatFxLayer) {
    return;
  }

  const origin = combatEffectPoint(attackerUnit);
  const target = combatEffectPoint(defenderUnit);
  const travelX = target.x - origin.x;
  const travelY = target.y - origin.y;
  const projectile = document.createElement("span");
  const impact = document.createElement("span");
  const projectileType = combatEvent.abilityNames.length
    ? "ability"
    : (combatEvent.critical ? "critical" : "standard");

  projectile.className = `combat-projectile combat-projectile--${projectileType}`;
  projectile.style.left = `${origin.x}px`;
  projectile.style.top = `${origin.y}px`;
  projectile.style.setProperty("--travel-x", `${travelX}px`);
  projectile.style.setProperty("--travel-y", `${travelY}px`);
  projectile.style.setProperty("--projectile-angle", `${Math.atan2(travelY, travelX)}rad`);
  projectile.innerHTML = "<i></i>";

  impact.className = `combat-impact-burst combat-impact-burst--${combatEvent.dodged ? "miss" : projectileType}`;
  impact.style.left = `${target.x}px`;
  impact.style.top = `${target.y}px`;
  impact.innerHTML = "<i></i><i></i><i></i>";

  combatFxLayer.append(projectile, impact);
  removeCombatEffect(projectile, 850);
  removeCombatEffect(impact, 900);
}

function showCombatAbilityCallout(combatEvent) {
  if (!combatEvent.abilityNames.length || !combatFxLayer) {
    return;
  }

  const abilityCallout = document.createElement("div");
  abilityCallout.className = "combat-ability-callout";
  abilityCallout.innerHTML = `
    <small>Ability Proc</small>
    <strong>${combatEvent.abilityNames.slice(0, 2).join(" + ")}</strong>
  `;
  combatFxLayer.append(abilityCallout);
  removeCombatEffect(abilityCallout, 920);
}

function addCombatTimelineEntry(combatEvent, eventIndex) {
  const eventType = combatEvent.dodged
    ? "dodge"
    : (combatEvent.defeated ? "knockout" : (combatEvent.critical ? "critical" : "hit"));
  const resultText = combatEvent.dodged
    ? "Evaded"
    : (combatEvent.defeated ? "Knockout" : `${combatEvent.damage} damage`);
  const timelineEntry = document.createElement("article");

  timelineEntry.className = `combat-timeline__entry combat-timeline__entry--${eventType}`;
  timelineEntry.innerHTML = `
    <b>${String(eventIndex + 1).padStart(2, "0")}</b>
    <span><strong>${combatEvent.attackerName}</strong><i>${resultText}</i></span>
    <em>${combatEvent.defenderName}</em>
  `;
  combatTimeline.prepend(timelineEntry);

  while (combatTimeline.children.length > 5) {
    combatTimeline.lastElementChild.remove();
  }
}

function updateCombatRemainingCounts() {
  playerCombatRemaining.textContent = playerCombatTeam.querySelectorAll(".combat-unit:not(.combat-unit--defeated)").length;
  enemyCombatRemaining.textContent = enemyCombatTeam.querySelectorAll(".combat-unit:not(.combat-unit--defeated)").length;
}

function playCombatMoment(combatEvent, attackerUnit, defenderUnit, eventIndex, totalEvents) {
  const chargeBar = attackerUnit?.querySelector(".combat-unit__charge i");
  const eventProgress = totalEvents > 0 ? ((eventIndex + 1) / totalEvents) * 100 : 100;

  combatEventCounter.textContent = String(eventIndex + 1).padStart(2, "0");
  combatEventProgress.style.width = `${eventProgress}%`;
  combatArena.style.setProperty("--combat-progress", `${eventProgress}%`);

  if (chargeBar) {
    chargeBar.style.width = combatEvent.abilityNames.length
      ? "100%"
      : `${Math.min(92, 24 + ((eventIndex % 4) * 22))}%`;
  }

  attackerUnit?.classList.toggle("combat-unit--ability", combatEvent.abilityNames.length > 0);
  defenderUnit?.classList.add("combat-unit--targeted");

  if (combatEvent.dodged) {
    window.PRWAudio?.play("dodge");
  } else if (combatEvent.defeated || combatEvent.attackerDefeated) {
    window.PRWAudio?.play("knockout");
  } else {
    window.PRWAudio?.play(combatEvent.critical ? "critical" : "attack", { critical: combatEvent.critical });
  }

  if (combatEvent.healing) {
    window.PRWAudio?.play("heal");
  }

  spawnCombatProjectile(attackerUnit, defenderUnit, combatEvent);
  showCombatAbilityCallout(combatEvent);
  addCombatTimelineEntry(combatEvent, eventIndex);

  if (combatEvent.dodged) {
    spawnFloatingCombatText(defenderUnit, "EVADE", "dodge");
  } else {
    const damagePrefix = combatEvent.critical ? "CRIT " : "";
    spawnFloatingCombatText(
      defenderUnit,
      `${damagePrefix}-${combatEvent.damage}`,
      combatEvent.defeated ? "knockout" : (combatEvent.critical ? "critical" : "damage"),
    );
  }

  if (combatEvent.healing) {
    attackerUnit?.classList.add("combat-unit--healing");
    spawnFloatingCombatText(attackerUnit, `+${combatEvent.healing}`, "healing");
  }

  if (combatEvent.retaliationDamage) {
    spawnFloatingCombatText(attackerUnit, `-${combatEvent.retaliationDamage} REFLECT`, "retaliation");
  }

  combatArena.classList.remove("combat-arena--impact", "combat-arena--heavy-impact");
  void combatArena.offsetWidth;
  combatArena.classList.add(
    combatEvent.critical || combatEvent.defeated ? "combat-arena--heavy-impact" : "combat-arena--impact",
  );
}

function playCombatEvents(result, eventIndex = 0) {
  if (gameState.phase !== "combat") {
    return;
  }

  const combatEvent = result?.events[eventIndex];

  if (!combatEvent) {
    combatEventProgress.style.width = "100%";
    combatArena.classList.add("combat-arena--finalizing");
    combatFeed.textContent = "Final strike confirmed. Calculating battle damage…";
    combatPhaseTimeout = window.setTimeout(resolveCombatPhase, 1100);
    return;
  }

  combatArena.querySelectorAll(".combat-unit--attacking, .combat-unit--hit, .combat-unit--dodged, .combat-unit--ability, .combat-unit--healing, .combat-unit--targeted").forEach((unit) => {
    unit.classList.remove(
      "combat-unit--attacking",
      "combat-unit--hit",
      "combat-unit--dodged",
      "combat-unit--ability",
      "combat-unit--healing",
      "combat-unit--targeted",
    );
  });

  const attackerUnit = getCombatUnit(combatEvent.attackerSide, combatEvent.attackerIndex, result);
  const defenderUnit = getCombatUnit(combatEvent.defenderSide, combatEvent.defenderIndex, result);

  attackerUnit?.classList.add("combat-unit--attacking");
  defenderUnit?.classList.add(combatEvent.dodged ? "combat-unit--dodged" : "combat-unit--hit");
  setCombatUnitHealth(defenderUnit, combatEvent.remainingHealth, combatEvent.maxHealth);
  setCombatUnitHealth(attackerUnit, combatEvent.attackerRemainingHealth, combatEvent.attackerMaxHealth);

  if (combatEvent.defeated) {
    defenderUnit?.classList.add("combat-unit--defeated");
  }

  if (combatEvent.attackerDefeated) {
    attackerUnit?.classList.add("combat-unit--defeated");
  }

  updateCombatRemainingCounts();
  playCombatMoment(combatEvent, attackerUnit, defenderUnit, eventIndex, result.events.length);

  const abilityCallout = combatEvent.abilityNames.length
    ? `${combatEvent.abilityNames.join(" + ")}!`
    : (combatEvent.critical ? "Critical hit!" : "Attack");
  const recoveryText = combatEvent.healing ? ` ${combatEvent.attackerName} restored ${combatEvent.healing} health.` : "";
  const retaliationText = combatEvent.retaliationDamage ? ` ${combatEvent.attackerName} took ${combatEvent.retaliationDamage} retaliation damage.` : "";

  if (combatEvent.dodged) {
    combatFeed.innerHTML = `<strong>${abilityCallout}</strong> ${combatEvent.defenderName} dodged ${combatEvent.attackerName}'s attack.`;
  } else if (combatEvent.defeated) {
    combatFeed.innerHTML = `<strong>${abilityCallout}</strong> ${combatEvent.attackerName} eliminated ${combatEvent.defenderName}.${recoveryText}${retaliationText}`;
  } else {
    combatFeed.innerHTML = `<strong>${abilityCallout}</strong> ${combatEvent.attackerName} dealt ${combatEvent.damage} damage to ${combatEvent.defenderName}.${recoveryText}${retaliationText}`;
  }
  combatPhaseTimeout = window.setTimeout(
    () => playCombatEvents(result, eventIndex + 1),
    COMBAT_EVENT_DURATION,
  );
}

function findInitialViewedResult() {
  const humanPlayer = getHumanPlayer();

  if (!gameState.spectating && !humanPlayer.eliminated) {
    return gameState.combatResults.find(
      (result) => result.firstPlayerId === humanPlayer.id || result.secondPlayerId === humanPlayer.id,
    );
  }

  return gameState.combatResults.find(
    (result) => result.firstPlayerId === gameState.spectatedPlayerId
      || result.secondPlayerId === gameState.spectatedPlayerId,
  ) || gameState.combatResults[0];
}

function showViewedCombatResult(result, { playEvents = true } = {}) {
  if (!result) return;

  window.clearTimeout(combatPhaseTimeout);
  gameState.viewedCombatResult = result;
  gameState.viewedPairingIndex = Math.max(0, gameState.combatResults.indexOf(result));
  const isSpectatorView = gameState.spectating || getHumanPlayer().eliminated;

  playerCombatLabel.textContent = isSpectatorView ? "Observed Squad" : "Your Squad";
  playerCombatName.textContent = result.firstPlayerName;
  enemyCombatName.textContent = result.secondPlayerName;
  renderCombatTeam(playerCombatTeam, result.firstTeam);
  renderCombatTeam(enemyCombatTeam, result.secondTeam);
  updateCombatRemainingCounts();
  combatFxLayer.innerHTML = "";
  combatTimeline.innerHTML = "";
  combatEventCounter.textContent = "00";
  combatEventProgress.style.width = "0%";
  combatArena.classList.remove("combat-arena--finalizing", "combat-arena--impact", "combat-arena--heavy-impact");
  combatFeed.textContent = `Round ${gameState.round}: ${result.firstPlayerName} is engaging ${result.secondPlayerName}.`;
  spectatorControls.hidden = !isSpectatorView;
  spectatorMatchLabel.textContent = `Battle ${gameState.viewedPairingIndex + 1} of ${gameState.combatResults.length}`;
  spectatorPrevious.disabled = gameState.combatResults.length < 2;
  spectatorNext.disabled = gameState.combatResults.length < 2;

  if (isSpectatorView) {
    const observedId = result.firstPlayerId.startsWith("ghost-") ? result.secondPlayerId : result.firstPlayerId;
    gameState.spectatedPlayerId = observedId;
  }

  if (playEvents) {
    const hasOpeningBuffs = showCombatOpeningBuffs(result);
    combatPhaseTimeout = window.setTimeout(
      () => playCombatEvents(result),
      hasOpeningBuffs ? 1550 : 700,
    );
  }
}

function cycleSpectatedBattle(direction) {
  if (!gameState.spectating || gameState.phase !== "combat" || document.body.classList.contains("combat-resolved") || gameState.combatResults.length < 2) return;
  const nextIndex = (gameState.viewedPairingIndex + direction + gameState.combatResults.length) % gameState.combatResults.length;
  showViewedCombatResult(gameState.combatResults[nextIndex]);
  announce(`Now spectating battle ${nextIndex + 1} of ${gameState.combatResults.length}.`);
}

function spectatorCombatHeroMarkup(hero, side, index, result) {
  const openingData = result.openingBuffs?.[side]?.[index];
  const maxHealth = openingData?.maxHealth || hero.health;
  const power = openingData?.power || hero.power;

  return `
    <figure class="spectator-fighter" data-combat-side="${side}" data-combat-index="${index}" title="${hero.name} // ${hero.ability?.name || "Standard Attack"}">
      <span><img src="${hero.image}" alt="${hero.name}"><i>LV ${hero.level || 1}</i></span>
      <figcaption><strong>${hero.name}</strong><small>✦ ${power} · ♥ ${maxHealth}</small></figcaption>
      <em class="spectator-fighter__health" aria-label="${maxHealth} of ${maxHealth} health"><i style="width:100%"></i><b>${maxHealth}</b></em>
    </figure>
  `;
}

function spectatorBattleMarkup(result, battleIndex) {
  return `
    <article class="spectator-battle" data-battle-index="${battleIndex}">
      <header>
        <div><span>${result.firstPlayerName}</span><b data-remaining-side="first">${result.firstTeam.length}</b></div>
        <i><small>Feed ${String(battleIndex + 1).padStart(2, "0")}</small>VS</i>
        <div><span>${result.secondPlayerName}</span><b data-remaining-side="second">${result.secondTeam.length}</b></div>
      </header>
      <div class="spectator-battle__arena">
        <section data-broadcast-side="first">${result.firstTeam.map((hero, index) => spectatorCombatHeroMarkup(hero, "first", index, result)).join("") || "<p>No squad</p>"}</section>
        <section data-broadcast-side="second">${result.secondTeam.map((hero, index) => spectatorCombatHeroMarkup(hero, "second", index, result)).join("") || "<p>No squad</p>"}</section>
      </div>
      <div class="spectator-battle__feed"><i></i><span>Engagement initialized</span><b>00</b></div>
      <footer>
        <span class="spectator-battle__result">LIVE // Resolving</span>
        <button type="button" data-spectator-recap-index="${battleIndex}" hidden>View Recap</button>
      </footer>
    </article>
  `;
}

function renderSpectatorCombatBroadcast() {
  spectatorCombatBroadcast.hidden = false;
  spectatorBattleCount.textContent = gameState.combatResults.length;
  spectatorCombatGrid.innerHTML = gameState.combatResults
    .map(spectatorBattleMarkup)
    .join("");
}

function getSpectatorCombatUnit(battleIndex, side, unitIndex) {
  return spectatorCombatGrid.querySelector(
    `[data-battle-index="${battleIndex}"] [data-broadcast-side="${side}"] [data-combat-index="${unitIndex}"]`,
  );
}

function setSpectatorCombatUnitHealth(unit, currentHealth, maxHealth) {
  if (!unit) return;
  const safeHealth = Math.max(0, currentHealth);
  const percent = maxHealth > 0 ? (safeHealth / maxHealth) * 100 : 0;
  const bar = unit.querySelector(".spectator-fighter__health i");
  const value = unit.querySelector(".spectator-fighter__health b");
  if (bar) bar.style.width = `${percent}%`;
  if (value) value.textContent = Math.ceil(safeHealth);
  unit.classList.toggle("spectator-fighter--danger", percent > 0 && percent <= 30);
}

function updateSpectatorBattleCounts(battleCard) {
  ["first", "second"].forEach((side) => {
    const count = battleCard.querySelectorAll(`[data-broadcast-side="${side}"] .spectator-fighter:not(.spectator-fighter--defeated)`).length;
    const counter = battleCard.querySelector(`[data-remaining-side="${side}"]`);
    if (counter) counter.textContent = count;
  });
}

function playSpectatorBattleMoment(result, battleIndex, combatEvent, eventIndex) {
  const battleCard = spectatorCombatGrid.querySelector(`[data-battle-index="${battleIndex}"]`);
  if (!battleCard) return;
  const attacker = getSpectatorCombatUnit(battleIndex, combatEvent.attackerSide, combatEvent.attackerIndex);
  const defender = getSpectatorCombatUnit(battleIndex, combatEvent.defenderSide, combatEvent.defenderIndex);
  const feed = battleCard.querySelector(".spectator-battle__feed");

  battleCard.querySelectorAll(".spectator-fighter--attacking, .spectator-fighter--hit, .spectator-fighter--dodge, .spectator-fighter--ability").forEach((unit) => {
    unit.classList.remove("spectator-fighter--attacking", "spectator-fighter--hit", "spectator-fighter--dodge", "spectator-fighter--ability");
  });
  attacker?.classList.add("spectator-fighter--attacking");
  defender?.classList.add(combatEvent.dodged ? "spectator-fighter--dodge" : "spectator-fighter--hit");
  attacker?.classList.toggle("spectator-fighter--ability", combatEvent.abilityNames.length > 0);
  setSpectatorCombatUnitHealth(defender, combatEvent.remainingHealth, combatEvent.maxHealth);
  setSpectatorCombatUnitHealth(attacker, combatEvent.attackerRemainingHealth, combatEvent.attackerMaxHealth);

  if (combatEvent.defeated) defender?.classList.add("spectator-fighter--defeated");
  if (combatEvent.attackerDefeated) attacker?.classList.add("spectator-fighter--defeated");
  updateSpectatorBattleCounts(battleCard);

  const eventText = combatEvent.dodged
    ? `${combatEvent.defenderName} evaded ${combatEvent.attackerName}`
    : combatEvent.defeated
      ? `${combatEvent.attackerName} knocked out ${combatEvent.defenderName}`
      : `${combatEvent.attackerName} dealt ${combatEvent.damage} to ${combatEvent.defenderName}`;
  feed.querySelector("span").textContent = eventText;
  feed.querySelector("b").textContent = String(eventIndex + 1).padStart(2, "0");
  feed.classList.toggle("spectator-battle__feed--ko", combatEvent.defeated);
  feed.classList.toggle("spectator-battle__feed--ability", combatEvent.abilityNames.length > 0);
}

function finishSpectatorBattleCard(result, battleIndex) {
  const battleCard = spectatorCombatGrid.querySelector(`[data-battle-index="${battleIndex}"]`);
  if (!battleCard || battleCard.classList.contains("spectator-battle--complete")) return;
  const firstWon = result.winner.id === result.firstPlayerId;
  battleCard.classList.add("spectator-battle--complete", firstWon ? "spectator-battle--first-won" : "spectator-battle--second-won");
  const status = battleCard.querySelector(".spectator-battle__result");
  const recapButton = battleCard.querySelector("[data-spectator-recap-index]");
  status.textContent = `${result.winner.name} WINS // ${result.loser.name} -${result.damage} HP`;
  recapButton.hidden = false;
}

function playAllSpectatorCombatEvents(eventIndex = 0) {
  if (!gameState.spectating || gameState.phase !== "combat") return;
  const longestBattle = Math.max(0, ...gameState.combatResults.map((result) => result.events.length));
  const progress = longestBattle ? Math.min(100, ((eventIndex + 1) / longestBattle) * 100) : 100;
  combatEventCounter.textContent = String(Math.min(eventIndex + 1, longestBattle)).padStart(2, "0");
  combatEventProgress.style.width = `${progress}%`;

  gameState.combatResults.forEach((result, battleIndex) => {
    const combatEvent = result.events[eventIndex];
    if (combatEvent) {
      playSpectatorBattleMoment(result, battleIndex, combatEvent, eventIndex);
    } else if (eventIndex >= result.events.length) {
      finishSpectatorBattleCard(result, battleIndex);
    }
  });

  if (eventIndex >= longestBattle) {
    teamTitleElement.textContent = "All Battles Complete";
    matchPhaseLabel.textContent = "Broadcast results";
    combatPhaseTimeout = window.setTimeout(resolveCombatPhase, 900);
    return;
  }

  combatPhaseTimeout = window.setTimeout(
    () => playAllSpectatorCombatEvents(eventIndex + 1),
    Math.max(300, COMBAT_EVENT_DURATION * 0.72),
  );
}

function startCombatPhase() {
  if (gameState.phase !== "build-complete") {
    return;
  }

  gameState.phase = "combat";
  window.PRWAudio?.setScene("combat");
  window.PRWAudio?.play("combatStart");
  document.body.classList.add("combat-phase", "combat-resolving");
  document.body.classList.remove("combat-resolved");
  combatArena.classList.remove(
    "combat-arena--impact",
    "combat-arena--heavy-impact",
    "combat-arena--finalizing",
  );
  deploymentWorkspace.hidden = true;
  spectatorBuildBoard.hidden = true;
  combatArena.hidden = false;
  spectatorControls.hidden = true;
  spectatorCombatBroadcast.hidden = true;
  combatMatchup.hidden = false;
  document.body.classList.toggle("spectator-multi-view", gameState.spectating);
  combatFxLayer.innerHTML = "";
  combatTimeline.innerHTML = "";
  combatRoundResult.hidden = true;
  combatRoundResult.setAttribute("aria-hidden", "true");
  combatRoundResult.className = "combat-round-result";
  combatRoundBadge.textContent = `Round ${String(gameState.round).padStart(2, "0")}`;
  combatEventCounter.textContent = "00";
  combatEventProgress.style.width = "0%";
  teamKickerElement.innerHTML = "<span>Combat Zone</span> // Round Engagement";
  teamTitleElement.textContent = "Autobattle In Progress";
  buildTimerChip.querySelector("small").textContent = "Combat";
  buildTimerElement.textContent = "FIGHT";
  matchPhaseLabel.textContent = "Combat phase";

  renderLeaderboard();
  announce(gameState.spectating
    ? "Spectator uplink connected. AI battles are resolving automatically."
    : "Combat phase started. All battles are resolving automatically.");

  gameState.combatResults = gameState.pairings.map(([firstPlayer, secondPlayer]) => {
    const result = simulateBattle(firstPlayer, secondPlayer);
    return {
      ...result,
      firstPlayerId: firstPlayer.id,
      secondPlayerId: secondPlayer.id,
      firstPlayerName: firstPlayer.name,
      secondPlayerName: secondPlayer.name,
      firstTeam: firstPlayer.team.filter(Boolean),
      secondTeam: secondPlayer.team.filter(Boolean),
      damage: calculateCombatDamage(result.survivors),
    };
  });

  if (gameState.spectating) {
    gameState.viewedCombatResult = gameState.combatResults[0] || null;
    combatMatchup.hidden = true;
    renderSpectatorCombatBroadcast();
    teamKickerElement.innerHTML = "<span>Multicast Arena</span> // Every Remaining Fight";
    teamTitleElement.textContent = "All Battles Live";
    matchPhaseLabel.textContent = `${gameState.combatResults.length} battles live`;
    combatPhaseTimeout = window.setTimeout(() => playAllSpectatorCombatEvents(), 550);
  } else {
    showViewedCombatResult(findInitialViewedResult());
  }
}

function resolveCombatPhase() {
  if (gameState.phase !== "combat") {
    return;
  }

  gameState.combatResults.forEach((result) => {
    if (!result.loser.isGhost) {
      result.loser.hp = Math.max(0, result.loser.hp - result.damage);
      result.loser.eliminated = result.loser.hp === 0;
      result.loser.buildStatus = result.loser.eliminated ? "Eliminated" : `Lost ${result.damage} HP`;
    }

    if (!result.winner.isGhost) {
      result.winner.buildStatus = "Battle won";
    }
  });

  if (gameState.spectating) {
    gameState.combatResults.forEach(finishSpectatorBattleCard);
    document.body.classList.remove("combat-resolving");
    document.body.classList.add("combat-resolved");
    combatEventProgress.style.width = "100%";
    updateHud();
    renderLeaderboard();
    renderThreatPreview();
    announce(`All ${gameState.combatResults.length} spectator battles are complete. Recaps are available on every feed.`);
    nextRoundTimeout = window.setTimeout(completeCombatRound, COMBAT_RESULT_DURATION);
    return;
  }

  const humanPlayer = getHumanPlayer();
  const viewedResult = gameState.viewedCombatResult;
  const humanResult = gameState.combatResults.find(
    (result) => result.winner.isHuman || result.loser.isHuman,
  );
  const isHumanBattle = Boolean(humanResult && viewedResult === humanResult && !gameState.spectating);
  const humanWon = Boolean(humanResult?.winner.isHuman);
  const viewedLeftWon = viewedResult?.winner.id === viewedResult?.firstPlayerId;
  const viewedWinner = viewedResult?.winner;
  const viewedLoser = viewedResult?.loser;
  const resultVictoryStyle = isHumanBattle ? humanWon : viewedLeftWon;
  window.PRWAudio?.play(isHumanBattle && !humanWon ? "defeat" : "victory");

  document.body.classList.remove("combat-resolving");
  document.body.classList.add("combat-resolved", resultVictoryStyle ? "combat-victory" : "combat-defeat");
  spectatorPrevious.disabled = true;
  spectatorNext.disabled = true;
  combatArena.classList.remove("combat-arena--finalizing", "combat-arena--impact", "combat-arena--heavy-impact");
  combatRoundResult.hidden = false;
  combatRoundResult.setAttribute("aria-hidden", "false");
  combatRoundResult.className = `combat-round-result combat-round-result--${resultVictoryStyle ? "victory" : "defeat"}`;
  combatRoundResultKicker.textContent = `Round ${String(gameState.round).padStart(2, "0")} Complete`;
  combatRoundResultTitle.textContent = isHumanBattle
    ? (humanWon ? "Victory" : "Defeat")
    : `${viewedWinner?.name || "Combatant"} Wins`;
  combatRoundResultDetail.textContent = isHumanBattle
    ? (humanWon
      ? `${humanResult?.loser.name || "Enemy squad"} neutralized // Integrity secure`
      : `${humanResult?.damage || 0} integrity damage // ${humanPlayer.hp} HP remains`)
    : `${viewedLoser?.name || "Opponent"} loses ${viewedResult?.damage || 0} integrity // Spectator feed`;
  combatFeed.innerHTML = isHumanBattle
    ? (humanWon
      ? `<strong>Victory!</strong> ${humanResult?.loser.name || "The enemy"} was defeated. You lose no HP.`
      : `<strong>Defeat.</strong> ${humanResult?.winner.name || "The enemy"} dealt ${humanResult?.damage || 0} damage. ${humanPlayer.hp} HP remains.`)
    : `<strong>${viewedWinner?.name || "The winner"} takes the round!</strong> ${viewedLoser?.name || "The opponent"} loses ${viewedResult?.damage || 0} integrity.`;
  updateHud();
  renderLeaderboard();
  renderThreatPreview();
  announce(isHumanBattle
    ? (humanWon ? "Battle won. You lose no health." : `Battle lost. ${humanResult?.damage || 0} health lost.`)
    : `${viewedWinner?.name || "The observed commander"} won the spectated battle.`);

  nextRoundTimeout = window.setTimeout(completeCombatRound, COMBAT_RESULT_DURATION);
}

function showMatchResultScreen(isVictory, winnerName = "") {
  const spectatorFinish = gameState.spectating && !isVictory;
  gameState.phase = "game-over";
  gameState.buildPhaseActive = false;
  clearAiBuildTimers();
  window.clearInterval(buildTimerInterval);
  window.clearTimeout(combatPhaseTimeout);
  window.clearTimeout(nextRoundTimeout);
  window.clearTimeout(readyLaunchTimeout);
  document.body.classList.add("modal-open", "match-over");
  document.body.classList.toggle("match-defeat", !isVictory && !spectatorFinish);
  matchResult.hidden = false;
  spectateMatchButton.hidden = true;
  matchResultKicker.textContent = spectatorFinish ? "Broadcast Complete" : (isVictory ? "Match Complete" : "Squad Eliminated");
  matchResultTitle.textContent = spectatorFinish ? `${winnerName || "A Commander"} Wins` : (isVictory ? "Victory" : "Defeat");
  matchResultDescription.textContent = spectatorFinish
    ? "The final battle is complete. Thanks for staying on the spectator network."
    : (isVictory
      ? "You are the last commander standing."
      : `${winnerName || "Another commander"} remains in the fight. Your integrity reached zero.`);
  announce(spectatorFinish ? `${winnerName || "A commander"} won the match.` : (isVictory ? "Match victory." : "You have been eliminated from the match."));
}

function showEliminationPrompt(winnerName = "") {
  gameState.eliminationPromptOpen = true;
  gameState.buildPhaseActive = false;
  clearAiBuildTimers();
  window.clearInterval(buildTimerInterval);
  window.clearTimeout(combatPhaseTimeout);
  window.clearTimeout(nextRoundTimeout);
  window.clearTimeout(readyLaunchTimeout);
  document.body.classList.add("modal-open", "match-over", "match-defeat");
  matchResult.hidden = false;
  spectateMatchButton.hidden = false;
  matchResultKicker.textContent = "Squad Eliminated";
  matchResultTitle.textContent = "Defeat";
  matchResultDescription.textContent = `${winnerName || "Another commander"} remains in the fight. Continue watching every surviving AI battle or return to the menu.`;
  spectateMatchButton.focus();
  announce("Your squad was eliminated. Spectator mode is available.");
}

function beginSpectatorMode() {
  const alivePlayers = getAlivePlayers();
  if (!getHumanPlayer().eliminated || alivePlayers.length < 2) return;

  gameState.spectating = true;
  gameState.eliminationPromptOpen = false;
  gameState.spectatedPlayerId = [...alivePlayers].sort((first, second) => second.hp - first.hp)[0]?.id || null;
  matchResult.hidden = true;
  spectateMatchButton.hidden = true;
  document.body.classList.remove("modal-open", "match-over", "match-defeat");
  document.body.classList.add("spectator-mode");
  getHumanPlayer().buildStatus = "Spectating";
  renderLeaderboard();
  announce("Spectator mode activated. Select combatants to scout them or wait for the next battle.");
  completeCombatRound();
}

function completeCombatRound() {
  if (gameState.phase !== "combat") {
    return;
  }

  const humanPlayer = getHumanPlayer();
  const alivePlayers = getAlivePlayers();

  if (alivePlayers.length === 1) {
    showMatchResultScreen(alivePlayers[0].isHuman, alivePlayers[0].name);
    return;
  }

  if (humanPlayer.eliminated && !gameState.spectating) {
    const leadingOpponent = alivePlayers.sort((first, second) => second.hp - first.hp)[0];
    showEliminationPrompt(leadingOpponent?.name);
    return;
  }

  gameState.round += 1;
  gameState.credits += 8 + Math.min(4, gameState.round);
  gameState.phase = "build";
  window.PRWAudio?.setScene("build");
  gameState.buildPhaseActive = true;
  gameState.selectedShopId = null;
  document.body.classList.remove(
    "build-phase-ended",
    "combat-phase",
    "combat-resolving",
    "combat-resolved",
    "combat-victory",
    "combat-defeat",
    "spectator-multi-view",
  );
  combatArena.hidden = true;
  spectatorCombatBroadcast.hidden = true;
  spectatorControls.hidden = true;
  combatRoundResult.hidden = true;
  combatRoundResult.setAttribute("aria-hidden", "true");
  combatFxLayer.innerHTML = "";
  deploymentWorkspace.hidden = gameState.spectating;
  spectatorBuildBoard.hidden = !gameState.spectating;
  teamKickerElement.innerHTML = gameState.spectating
    ? "<span>Spectator Network</span> // Build Observation"
    : "<span>Squad Deployment</span> // Your Side";
  teamTitleElement.textContent = gameState.spectating ? "Awaiting Next Engagement" : "Assemble Your Strike Team";
  buildTimerChip.querySelector("small").textContent = "Build Time";
  matchPhaseLabel.textContent = gameState.spectating ? "Spectating build phase" : "Planning phase";
  players.filter((player) => !player.eliminated).forEach((player) => {
    player.ready = false;

    if (!player.isHuman) {
      player.buildStatus = "Preparing";
    }
  });
  const preservedFrozenShop = prepareShopForNextRound();
  renderRoster();
  startBuildTimer();
  renderSpectatorBuildBoard();
  announce(
    `Round ${gameState.round} build phase started. New credits received.${preservedFrozenShop ? " Frozen shop offers were preserved." : ""}`,
  );
}

function finishBuildPhase() {
  if (!gameState.buildPhaseActive || gameState.phase !== "build") {
    return;
  }

  gameState.buildPhaseActive = false;
  gameState.phase = "build-complete";
  hideHeroInfoPopover();
  window.clearTimeout(readyLaunchTimeout);
  readyLaunchTimeout = null;
  gameState.selectedShopId = null;
  window.clearInterval(buildTimerInterval);
  buildTimerInterval = null;
  buildTimerElement.textContent = "00:00";
  buildTimerRing.style.setProperty("--clock-second-angle", "360deg");
  buildTimerRing.style.setProperty("--clock-minute-angle", "150deg");
  buildTimerRing.style.setProperty("--clock-ring-progress", "360deg");
  buildTimerChip.classList.remove("timer-warning");
  buildTimerChip.classList.add("timer-ended");
  document.body.classList.add("build-phase-ended");
  spectatorBuildBoard.hidden = true;
  shopCards.forEach((card) => card.classList.remove("shop-card--selected"));
  completeAiBuilds();
  updateHud();
  announce("Build phase complete. Teams are entering combat.");
  combatPhaseTimeout = window.setTimeout(startCombatPhase, 700);
}

function updateBuildTimer() {
  const millisecondsRemaining = Math.max(0, gameState.buildEndsAt - Date.now());
  const secondsRemaining = Math.max(
    0,
    Math.ceil(millisecondsRemaining / 1000),
  );
  const elapsedProgress = 1 - (millisecondsRemaining / BUILD_PHASE_DURATION);
  const secondHandAngle = Math.min(360, elapsedProgress * 360);
  const minuteHandAngle = 120 + (elapsedProgress * 30);

  buildTimerElement.textContent = formatBuildTime(secondsRemaining);
  buildTimerRing.style.setProperty("--clock-second-angle", `${secondHandAngle.toFixed(2)}deg`);
  buildTimerRing.style.setProperty("--clock-minute-angle", `${minuteHandAngle.toFixed(2)}deg`);
  buildTimerRing.style.setProperty("--clock-ring-progress", `${secondHandAngle.toFixed(2)}deg`);
  buildTimerChip.classList.toggle("timer-warning", secondsRemaining <= 10 && secondsRemaining > 0);

  if (secondsRemaining === 0) {
    finishBuildPhase();
  }
}

function startBuildTimer() {
  window.clearInterval(buildTimerInterval);
  buildTimerChip.classList.remove("timer-warning", "timer-ended");
  buildTimerRing.style.setProperty("--clock-second-angle", "0deg");
  buildTimerRing.style.setProperty("--clock-minute-angle", "120deg");
  buildTimerRing.style.setProperty("--clock-ring-progress", "0deg");
  gameState.buildEndsAt = Date.now() + BUILD_PHASE_DURATION;
  prepareRoundPairings();
  scheduleAiBuilds();
  updateHud();
  checkAllPlayersReady();
  updateBuildTimer();
  buildTimerInterval = window.setInterval(updateBuildTimer, 250);
}

function initializeRandomShop() {
  const startingHeroes = shuffledHeroes(new Set(), shopCards.length);
  shopCards.forEach((card, index) => setShopCardHero(card, startingHeroes[index]));
}

function prepareShopForNextRound() {
  if (!gameState.shopFrozen) {
    initializeRandomShop();
    return false;
  }

  const preservedCards = shopCards.filter((card) => card.dataset.status !== "deployed");
  const refreshableCards = shopCards.filter((card) => card.dataset.status === "deployed");
  const preservedHeroIds = new Set(
    preservedCards
      .map((card) => shopHeroes.get(card.dataset.shopId)?.catalogId)
      .filter(Boolean),
  );
  const replacementHeroes = shuffledHeroes(preservedHeroIds, refreshableCards.length);

  refreshableCards.forEach((card, index) => setShopCardHero(card, replacementHeroes[index]));
  gameState.shopFrozen = false;
  return true;
}

function selectPurchasedHero(heroId) {
  const hero = shopHeroes.get(heroId);

  if (!gameState.buildPhaseActive || !hero || hero.card.dataset.status !== "purchased") {
    return;
  }

  const selectingNewHero = gameState.selectedShopId !== heroId;
  gameState.selectedShopId = selectingNewHero ? heroId : null;

  shopCards.forEach((card) => {
    const isSelected = card.dataset.shopId === gameState.selectedShopId;
    card.classList.toggle("shop-card--selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  announce(
    selectingNewHero
      ? `${hero.name} selected. Choose a squad or sideline slot.`
      : `${hero.name} selection cleared.`,
  );
}

function purchaseHero(heroId) {
  const hero = shopHeroes.get(heroId);

  if (!gameState.buildPhaseActive) {
    window.PRWAudio?.play("error");
    announce("The build phase has ended.");
    return;
  }

  if (!hero || hero.card.dataset.status !== "available") {
    return;
  }

  if (gameState.credits < hero.cost) {
    window.PRWAudio?.play("error");
    hero.card.classList.remove("shop-card--unaffordable");
    void hero.card.offsetWidth;
    hero.card.classList.add("shop-card--unaffordable");
    announce(`Not enough credits to purchase ${hero.name}.`);
    return;
  }

  markHumanNotReady();
  gameState.credits -= hero.cost;
  window.PRWAudio?.play("purchase");
  hero.card.dataset.status = "purchased";
  hero.card.draggable = false;
  hero.card.classList.add("shop-card--purchased");
  hero.card.classList.remove("shop-card--locked");
  hero.card.setAttribute(
    "aria-label",
    `${hero.name} purchased. Drag to a squad or sideline slot, or select it and choose a slot.`,
  );

  const buyButton = hero.card.querySelector(".shop-card__buy");
  buyButton.querySelector("span").textContent = "Owned";
  buyButton.querySelector("strong").textContent = "Drag";
  buyButton.setAttribute("aria-disabled", "true");

  updateHud();
  selectPurchasedHero(heroId);
  announce(`${hero.name} purchased for ${hero.cost} credits. Deploy it to your squad or sideline.`);
}

function emptySlotMarkup(slotIndex) {
  const slotNumber = String(slotIndex + 1).padStart(2, "0");

  return `
    <span class="team-slot__number">${slotNumber}</span>
    <span class="team-slot__plus" aria-hidden="true">+</span>
    <span class="team-slot__label">Drop Hero</span>
  `;
}

function heroSellValue(hero) {
  return Math.max(1, Math.ceil(hero.cost / 2));
}

function deployedHeroMarkup(hero, slotIndex) {
  const slotNumber = String(slotIndex + 1).padStart(2, "0");
  const sellValue = heroSellValue(hero);
  const tooltipId = `team-hero-inspect-${slotIndex}`;

  return `
    <div class="hero-card hero-card--${hero.universe}" draggable="true" data-team-slot="${slotIndex}" tabindex="0" role="button" aria-label="${hero.name} in team slot ${slotIndex + 1}. Power ${hero.power}, health ${hero.health}. Ability: ${hero.ability?.name || "Standard Attack"}. Drag to move." aria-describedby="${tooltipId}">
      <span class="hero-card__slot">${slotNumber}</span>
      <img src="${hero.image}" alt="${hero.name}">
      <img class="universe-badge" src="${hero.logo}" alt="">
      ${hero.ability ? `<span class="hero-card__ability" title="${hero.ability.name} — ${hero.ability.description}" aria-label="${hero.ability.name}: ${hero.ability.description}">A</span>` : ""}
      <div class="hero-inspect hero-inspect--team" id="${tooltipId}" role="tooltip">${heroInspectContent(hero)}</div>
      <button class="hero-card__sell" type="button" data-sell-slot="${slotIndex}" aria-label="Sell ${hero.name} for ${sellValue} credits">Sell <strong>+◆ ${sellValue}</strong></button>
      <span class="level-badge">LV 1</span>
      <div class="hero-stats" aria-label="Power ${hero.power}, health ${hero.health}">
        <span><i class="power-icon">&#10022;</i> ${hero.power}</span>
        <span><i class="health-icon">&#9829;</i> ${hero.health}</span>
      </div>
    </div>
  `;
}

function renderTeam() {
  teamSlots.forEach((slot, slotIndex) => {
    const hero = gameState.team[slotIndex];
    slot.className = "team-slot";

    if (hero) {
      slot.classList.add("team-slot--occupied");
      slot.setAttribute("aria-label", `Team slot ${slotIndex + 1}: ${hero.name}`);
      slot.removeAttribute("tabindex");
      slot.innerHTML = deployedHeroMarkup(hero, slotIndex);
    } else {
      slot.setAttribute("aria-label", `Empty team slot ${slotIndex + 1}`);
      slot.setAttribute("tabindex", "0");
      slot.innerHTML = emptySlotMarkup(slotIndex);
    }
  });

  updateHud();
}

function deployPurchasedHero(heroId, slotIndex) {
  const hero = shopHeroes.get(heroId);

  if (!gameState.buildPhaseActive || !hero || hero.card.dataset.status !== "purchased" || gameState.team[slotIndex]) {
    return false;
  }

  markHumanNotReady();
  gameState.team[slotIndex] = hero;
  gameState.selectedShopId = null;
  hero.card.dataset.status = "deployed";
  hero.card.draggable = false;
  hero.card.classList.remove("shop-card--purchased", "shop-card--selected", "shop-card--dragging");
  hero.card.classList.add("shop-card--deployed");
  hero.card.setAttribute("aria-label", `${hero.name} deployed to team slot ${slotIndex + 1}.`);
  hero.card.setAttribute("aria-pressed", "false");

  renderRoster();
  announce(`${hero.name} deployed to team slot ${slotIndex + 1}.`);
  return true;
}

function moveTeamHero(fromIndex, toIndex) {
  if (!gameState.buildPhaseActive || fromIndex === toIndex || !gameState.team[fromIndex]) {
    return;
  }

  const movingHero = gameState.team[fromIndex];
  const destinationHero = gameState.team[toIndex];
  markHumanNotReady();
  gameState.team[toIndex] = movingHero;
  gameState.team[fromIndex] = destinationHero;
  renderTeam();
  announce(`${movingHero.name} moved to team slot ${toIndex + 1}.`);
}

function sellTeamHero(slotIndex) {
  if (!gameState.buildPhaseActive || gameState.phase !== "build") {
    announce("Heroes can only be sold during the build phase.");
    return;
  }

  const hero = gameState.team[slotIndex];

  if (!hero) {
    return;
  }

  markHumanNotReady();
  const sellValue = heroSellValue(hero);
  gameState.credits += sellValue;
  gameState.team[slotIndex] = null;

  if (hero.card?.dataset.heroId === hero.catalogId && hero.card.dataset.status === "deployed") {
    const excludedIds = new Set([
      ...gameState.team.filter(Boolean).map((teamHero) => teamHero.catalogId),
      ...[...shopHeroes.values()].map((shopHero) => shopHero.catalogId),
    ]);
    const [replacementHero] = shuffledHeroes(excludedIds, 1);

    if (replacementHero) {
      setShopCardHero(hero.card, replacementHero);
    }
  }

  renderTeam();
  announce(`${hero.name} sold for ${sellValue} credits. A replacement offer is available.`);
}

function getRoster(zone) {
  return zone === "bench" ? gameState.bench : gameState.team;
}

function getRosterLabel(zone) {
  return zone === "bench" ? "sideline" : "team";
}

function rosterEntries() {
  return ["team", "bench"].flatMap((zone) => getRoster(zone).map((hero, index) => ({ zone, index, hero })));
}

function canMergeHeroes(firstHero, secondHero) {
  return Boolean(firstHero && secondHero)
    && heroCatalogId(firstHero) === heroCatalogId(secondHero)
    && (firstHero.level || 1) === (secondHero.level || 1)
    && (firstHero.level || 1) < MAX_HERO_LEVEL;
}

function findMergePartner(zone, slotIndex) {
  const hero = getRoster(zone)[slotIndex];
  return rosterEntries().find(
    (entry) => entry.hero
      && (entry.zone !== zone || entry.index !== slotIndex)
      && canMergeHeroes(hero, entry.hero),
  );
}

function rosterEmptySlotMarkup(slotIndex, zone) {
  const slotNumber = String(slotIndex + 1).padStart(2, "0");
  const label = zone === "bench" ? "Reserve Hero" : "Drop Hero";

  return `
    <span class="team-slot__number">${zone === "bench" ? "R" : ""}${slotNumber}</span>
    <span class="team-slot__plus" aria-hidden="true">+</span>
    <span class="team-slot__label">${label}</span>
  `;
}

function rosterHeroSellValue(hero) {
  const copyCount = 2 ** ((hero.level || 1) - 1);
  return Math.max(1, Math.ceil(hero.cost / 2)) * copyCount;
}

function rosterHeroMarkup(hero, zone, slotIndex) {
  const slotNumber = String(slotIndex + 1).padStart(2, "0");
  const sellValue = rosterHeroSellValue(hero);
  const tooltipId = `${zone}-hero-inspect-${slotIndex}`;
  const mergePartner = findMergePartner(zone, slotIndex);
  const level = hero.level || 1;
  const levelPips = Array.from(
    { length: MAX_HERO_LEVEL },
    (_, index) => `<i class="${index < level ? "is-filled" : ""}"></i>`,
  ).join("");
  const mergeButton = mergePartner
    ? `<button class="hero-card__merge" type="button" data-merge-zone="${zone}" data-merge-slot="${slotIndex}" aria-label="Merge ${hero.name} into level ${level + 1}">Merge <strong>LV ${level + 1}</strong></button>`
    : "";

  return `
    <div class="hero-card hero-card--${hero.universe} hero-card--level-${level}${mergePartner ? " hero-card--merge-ready" : ""}" draggable="true" data-roster-zone="${zone}" data-roster-index="${slotIndex}" tabindex="0" role="button" aria-label="Level ${level} ${hero.name} in ${getRosterLabel(zone)} slot ${slotIndex + 1}. Power ${hero.power}, health ${hero.health}. Drag to move or merge." aria-describedby="${tooltipId}">
      <span class="hero-card__slot">${zone === "bench" ? "R" : ""}${slotNumber}</span>
      <img src="${hero.image}" alt="${hero.name}">
      <img class="universe-badge" src="${hero.logo}" alt="">
      ${hero.ability ? `<span class="hero-card__ability" title="${hero.ability.name}: ${hero.ability.description}" aria-label="${hero.ability.name}: ${hero.ability.description}">A</span>` : ""}
      <div class="hero-inspect hero-inspect--team" id="${tooltipId}" role="tooltip">${heroInspectContent(hero)}</div>
      <button class="hero-card__sell" type="button" data-sell-zone="${zone}" data-sell-slot="${slotIndex}" aria-label="Sell ${hero.name} for ${sellValue} credits">Sell <strong>+&#9670; ${sellValue}</strong></button>
      ${mergeButton}
      <span class="level-badge">LV ${level}<small>/4</small></span>
      <span class="hero-card__level-pips" aria-hidden="true">${levelPips}</span>
      <div class="hero-stats" aria-label="Power ${hero.power}, health ${hero.health}">
        <span><i class="power-icon">&#10022;</i> ${hero.power}</span>
        <span><i class="health-icon">&#9829;</i> ${hero.health}</span>
      </div>
    </div>
  `;
}

function renderRosterZone(zone, slots) {
  const roster = getRoster(zone);

  slots.forEach((slot, slotIndex) => {
    const hero = roster[slotIndex];
    slot.className = `team-slot roster-slot${zone === "bench" ? " bench-slot" : ""}`;

    if (hero) {
      slot.classList.add("team-slot--occupied");
      slot.setAttribute("aria-label", `${getRosterLabel(zone)} slot ${slotIndex + 1}: level ${hero.level} ${hero.name}`);
      slot.removeAttribute("tabindex");
      slot.innerHTML = rosterHeroMarkup(hero, zone, slotIndex);
    } else {
      slot.setAttribute("aria-label", `Empty ${getRosterLabel(zone)} slot ${slotIndex + 1}`);
      slot.setAttribute("tabindex", "0");
      slot.innerHTML = rosterEmptySlotMarkup(slotIndex, zone);
    }
  });
}

function renderRoster() {
  hideHeroInfoPopover();
  renderRosterZone("team", teamSlots);
  renderRosterZone("bench", benchSlots);
  renderTraitPanel();
  updateHud();
}

function markShopHeroDeployed(hero, destinationLabel) {
  gameState.selectedShopId = null;
  hero.card.dataset.status = "deployed";
  hero.card.draggable = false;
  hero.card.classList.remove("shop-card--purchased", "shop-card--selected", "shop-card--dragging");
  hero.card.classList.add("shop-card--deployed");
  hero.card.setAttribute("aria-label", `${hero.name} deployed to ${destinationLabel}.`);
  hero.card.setAttribute("aria-pressed", "false");
}

function deployPurchasedHeroToRoster(heroId, zone, slotIndex) {
  const shopHero = shopHeroes.get(heroId);
  const roster = getRoster(zone);
  const destinationHero = roster[slotIndex];

  if (!gameState.buildPhaseActive || !shopHero || shopHero.card.dataset.status !== "purchased") {
    return false;
  }

  if (destinationHero && !canMergeHeroes(destinationHero, shopHero)) {
    window.PRWAudio?.play("error");
    announce("That slot is occupied. Use an empty slot or a matching level 1 hero.");
    return false;
  }

  markHumanNotReady();
  const destinationLabel = `${getRosterLabel(zone)} slot ${slotIndex + 1}`;

  if (destinationHero) {
    destinationHero.level = (destinationHero.level || 1) + 1;
    applyHeroLevelStats(destinationHero);
    markShopHeroDeployed(shopHero, destinationLabel);
    renderRoster();
    window.PRWAudio?.play("merge");
    announce(`${destinationHero.name} merged to level ${destinationHero.level}. Power and health increased.`);
    return true;
  }

  const deployedHero = createHeroInstance(shopHero);
  roster[slotIndex] = deployedHero;
  markShopHeroDeployed(shopHero, destinationLabel);
  renderRoster();
  window.PRWAudio?.play("deploy");
  announce(`${deployedHero.name} deployed to ${destinationLabel}.`);
  return true;
}

function moveRosterHero(fromZone, fromIndex, toZone, toIndex) {
  if (!gameState.buildPhaseActive || (fromZone === toZone && fromIndex === toIndex)) {
    return;
  }

  const sourceRoster = getRoster(fromZone);
  const destinationRoster = getRoster(toZone);
  const movingHero = sourceRoster[fromIndex];
  const destinationHero = destinationRoster[toIndex];

  if (!movingHero) {
    return;
  }

  markHumanNotReady();

  if (canMergeHeroes(movingHero, destinationHero)) {
    destinationHero.level = (destinationHero.level || 1) + 1;
    applyHeroLevelStats(destinationHero);
    sourceRoster[fromIndex] = null;
    renderRoster();
    window.PRWAudio?.play("merge");
    announce(`${destinationHero.name} merged to level ${destinationHero.level}. Power and health increased.`);
    return;
  }

  destinationRoster[toIndex] = movingHero;
  sourceRoster[fromIndex] = destinationHero;
  renderRoster();
  window.PRWAudio?.play("deploy");
  announce(`${movingHero.name} moved to ${getRosterLabel(toZone)} slot ${toIndex + 1}.`);
}

function mergeRosterHero(zone, slotIndex) {
  if (!gameState.buildPhaseActive || gameState.phase !== "build") {
    return;
  }

  const roster = getRoster(zone);
  const hero = roster[slotIndex];
  const partner = findMergePartner(zone, slotIndex);

  if (!hero || !partner) {
    window.PRWAudio?.play("error");
    announce(hero?.level >= MAX_HERO_LEVEL ? `${hero.name} is already level 4.` : "A matching hero of the same level is required.");
    return;
  }

  markHumanNotReady();
  getRoster(partner.zone)[partner.index] = null;
  hero.level = (hero.level || 1) + 1;
  applyHeroLevelStats(hero);
  renderRoster();
  window.PRWAudio?.play("levelUp");
  announce(`${hero.name} merged to level ${hero.level}. Power increased to ${hero.power} and health to ${hero.health}.`);
}

function sellRosterHero(zone, slotIndex) {
  if (!gameState.buildPhaseActive || gameState.phase !== "build") {
    announce("Heroes can only be sold during the build phase.");
    return;
  }

  const roster = getRoster(zone);
  const hero = roster[slotIndex];

  if (!hero) {
    return;
  }

  markHumanNotReady();
  const sellValue = rosterHeroSellValue(hero);
  gameState.credits += sellValue;
  roster[slotIndex] = null;
  window.PRWAudio?.play("sell");

  if (hero.card?.dataset.heroId === hero.catalogId && hero.card.dataset.status === "deployed") {
    const excludedIds = new Set([...shopHeroes.values()].map((shopHero) => shopHero.catalogId));
    const [replacementHero] = shuffledHeroes(excludedIds, 1);

    if (replacementHero) {
      setShopCardHero(hero.card, replacementHero);
    }
  }

  renderRoster();
  announce(`Level ${hero.level} ${hero.name} sold for ${sellValue} credits.`);
}

deploymentWorkspace.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".hero-card__sell, .hero-card__merge")) {
    event.stopPropagation();
  }
});

deploymentWorkspace.addEventListener("click", (event) => {
  const sellButton = event.target.closest(".hero-card__sell[data-sell-slot]");
  const mergeButton = event.target.closest(".hero-card__merge[data-merge-slot]");

  if (!sellButton && !mergeButton) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (sellButton) {
    sellRosterHero(sellButton.dataset.sellZone, Number(sellButton.dataset.sellSlot));
  } else {
    mergeRosterHero(mergeButton.dataset.mergeZone, Number(mergeButton.dataset.mergeSlot));
  }
});

shopCards.forEach((card) => {
  const heroId = card.dataset.shopId;
  const buyButton = card.querySelector(".shop-card__buy");

  buyButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (card.dataset.status === "available") {
      purchaseHero(heroId);
    } else if (card.dataset.status === "purchased") {
      selectPurchasedHero(heroId);
    }
  });

  card.addEventListener("click", () => {
    if (card.dataset.suppressClick === "true") {
      return;
    }

    if (card.dataset.status === "purchased") {
      selectPurchasedHero(heroId);
    }
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();

    if (card.dataset.status === "available") {
      purchaseHero(heroId);
    } else if (card.dataset.status === "purchased") {
      selectPurchasedHero(heroId);
    }
  });

  card.addEventListener("dragstart", (event) => {
    if (!gameState.buildPhaseActive || card.dataset.status !== "purchased") {
      event.preventDefault();
      return;
    }

    gameState.drag = { type: "shop", heroId };
    card.classList.add("shop-card--dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `shop:${heroId}`);
  });

  card.addEventListener("dragend", () => {
    gameState.drag = null;
    card.classList.remove("shop-card--dragging");
    rosterSlots.forEach((slot) => slot.classList.remove("team-slot--drag-over", "team-slot--merge-over"));
  });

  card.addEventListener("pointerdown", (event) => {
    if (!gameState.buildPhaseActive || card.dataset.status !== "purchased" || event.button !== 0) {
      return;
    }

    const cardRect = card.getBoundingClientRect();
    pointerDrag = {
      pointerId: event.pointerId,
      heroId,
      startX: event.clientX,
      startY: event.clientY,
      width: cardRect.width,
      currentSlot: null,
      ghost: null,
    };

    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId || pointerDrag.heroId !== heroId) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - pointerDrag.startX,
      event.clientY - pointerDrag.startY,
    );

    if (!pointerDrag.ghost && distance > 3) {
      const ghost = card.cloneNode(true);
      ghost.removeAttribute("tabindex");
      ghost.removeAttribute("aria-label");
      ghost.querySelector(".shop-card__buy")?.remove();
      ghost.classList.remove("shop-card--selected");
      ghost.classList.add("drag-ghost");
      ghost.style.width = `${pointerDrag.width}px`;
      document.body.append(ghost);
      pointerDrag.ghost = ghost;
      card.classList.add("shop-card--dragging");
    }

    if (!pointerDrag.ghost) {
      return;
    }

    event.preventDefault();
    pointerDrag.ghost.style.transform = `translate3d(${event.clientX - pointerDrag.width / 2}px, ${event.clientY - pointerDrag.width / 2}px, 0)`;

    const hoveredSlot = document.elementFromPoint(event.clientX, event.clientY)?.closest(".roster-slot");
    const hoveredIndex = hoveredSlot ? Number(hoveredSlot.dataset.slotIndex) : -1;
    const hoveredZone = hoveredSlot?.dataset.rosterZone;
    const targetHero = hoveredSlot ? getRoster(hoveredZone)[hoveredIndex] : null;
    const draggedHero = shopHeroes.get(heroId);
    const canDeploy = hoveredSlot && (!targetHero || canMergeHeroes(targetHero, draggedHero));

    rosterSlots.forEach((slot) => slot.classList.remove("team-slot--drag-over", "team-slot--merge-over"));
    pointerDrag.currentSlot = canDeploy ? hoveredSlot : null;
    pointerDrag.currentSlot?.classList.add("team-slot--drag-over");
    pointerDrag.currentSlot?.classList.toggle("team-slot--merge-over", Boolean(targetHero));
  });

  function finishPointerDrag(event) {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId || pointerDrag.heroId !== heroId) {
      return;
    }

    const releasedOverSlot = document.elementFromPoint(event.clientX, event.clientY)?.closest(".roster-slot");
    const releasedSlotIndex = releasedOverSlot ? Number(releasedOverSlot.dataset.slotIndex) : -1;
    const releasedZone = releasedOverSlot?.dataset.rosterZone;
    const releasedHero = releasedOverSlot ? getRoster(releasedZone)[releasedSlotIndex] : null;
    const draggedHero = shopHeroes.get(heroId);
    const targetSlot = pointerDrag.currentSlot
      || (releasedOverSlot && (!releasedHero || canMergeHeroes(releasedHero, draggedHero)) ? releasedOverSlot : null);
    const wasDragging = Boolean(pointerDrag.ghost);
    pointerDrag.ghost?.remove();
    card.classList.remove("shop-card--dragging");
    rosterSlots.forEach((slot) => slot.classList.remove("team-slot--drag-over", "team-slot--merge-over"));

    if (card.hasPointerCapture(event.pointerId)) {
      card.releasePointerCapture(event.pointerId);
    }

    pointerDrag = null;

    if (wasDragging) {
      card.dataset.suppressClick = "true";
      window.setTimeout(() => delete card.dataset.suppressClick, 0);
    }

    if (targetSlot) {
      deployPurchasedHeroToRoster(heroId, targetSlot.dataset.rosterZone, Number(targetSlot.dataset.slotIndex));
    }
  }

  card.addEventListener("pointerup", finishPointerDrag);
  card.addEventListener("pointercancel", finishPointerDrag);
  window.addEventListener("pointerup", finishPointerDrag);
  window.addEventListener("pointercancel", finishPointerDrag);
});

deploymentWorkspace.addEventListener("dragstart", (event) => {
  const heroCard = event.target.closest(".hero-card[data-roster-zone]");

  if (event.target.closest(".hero-card__sell, .hero-card__merge")) {
    event.preventDefault();
    return;
  }

  if (!gameState.buildPhaseActive || !heroCard) {
    return;
  }

  const zone = heroCard.dataset.rosterZone;
  const slotIndex = Number(heroCard.dataset.rosterIndex);
  gameState.drag = { type: "roster", zone, slotIndex };
  heroCard.classList.add("hero-card--dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", `${zone}:${slotIndex}`);
});

deploymentWorkspace.addEventListener("dragend", (event) => {
  event.target.closest(".hero-card")?.classList.remove("hero-card--dragging");
  gameState.drag = null;
  rosterSlots.forEach((slot) => slot.classList.remove("team-slot--drag-over", "team-slot--merge-over"));
});

rosterSlots.forEach((slot) => {
  const zone = slot.dataset.rosterZone;
  const slotIndex = Number(slot.dataset.slotIndex);

  slot.addEventListener("dragover", (event) => {
    if (!gameState.buildPhaseActive || !gameState.drag) {
      return;
    }

    const destinationHero = getRoster(zone)[slotIndex];
    const shopHero = gameState.drag.type === "shop" ? shopHeroes.get(gameState.drag.heroId) : null;
    const canDropShopHero = gameState.drag.type === "shop"
      && (!destinationHero || canMergeHeroes(destinationHero, shopHero));
    const canMoveRosterHero = gameState.drag.type === "roster";

    if (canDropShopHero || canMoveRosterHero) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      slot.classList.add("team-slot--drag-over");

      if (canDropShopHero && destinationHero) {
        slot.classList.add("team-slot--merge-over");
      } else if (canMoveRosterHero) {
        const movingHero = getRoster(gameState.drag.zone)[gameState.drag.slotIndex];
        slot.classList.toggle("team-slot--merge-over", canMergeHeroes(movingHero, destinationHero));
      }
    }
  });

  slot.addEventListener("dragleave", (event) => {
    if (!slot.contains(event.relatedTarget)) {
      slot.classList.remove("team-slot--drag-over", "team-slot--merge-over");
    }
  });

  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    slot.classList.remove("team-slot--drag-over", "team-slot--merge-over");

    if (gameState.drag?.type === "shop") {
      deployPurchasedHeroToRoster(gameState.drag.heroId, zone, slotIndex);
    } else if (gameState.drag?.type === "roster") {
      moveRosterHero(gameState.drag.zone, gameState.drag.slotIndex, zone, slotIndex);
    }

    gameState.drag = null;
  });

  slot.addEventListener("click", () => {
    if (gameState.selectedShopId) {
      deployPurchasedHeroToRoster(gameState.selectedShopId, zone, slotIndex);
    }
  });

  slot.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && gameState.selectedShopId) {
      event.preventDefault();
      deployPurchasedHeroToRoster(gameState.selectedShopId, zone, slotIndex);
    }
  });
});

document.addEventListener("pointerover", (event) => {
  const card = closestHeroInfoCard(event.target);

  if (card && !card.contains(event.relatedTarget)) {
    showHeroInfoPopover(card);
  }
});

document.addEventListener("pointerout", (event) => {
  const card = closestHeroInfoCard(event.target);

  if (card && !card.contains(event.relatedTarget) && !card.contains(document.activeElement)) {
    hideHeroInfoPopover();
  }
});

document.addEventListener("focusin", (event) => {
  const card = closestHeroInfoCard(event.target);

  if (card) {
    showHeroInfoPopover(card);
  }
});

document.addEventListener("focusout", (event) => {
  const card = closestHeroInfoCard(event.target);

  if (!card) {
    return;
  }

  window.setTimeout(() => {
    if (!card.contains(document.activeElement) && activeHeroInfoAnchor === card) {
      hideHeroInfoPopover();
    }
  }, 0);
});

window.addEventListener("scroll", queueHeroInfoPosition, { passive: true, capture: true });
window.addEventListener("resize", queueHeroInfoPosition, { passive: true });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!combatRecap.hidden) {
      closeCombatRecap();
      return;
    }

    if (!scoutOverlay.hidden) {
      closeScoutPanel();
      return;
    }

    hideHeroInfoPopover();
  }
});

playerListElement.addEventListener("click", (event) => {
  const playerRow = event.target.closest(".player-row[data-player-id]");
  if (playerRow) openScoutPanel(playerRow.dataset.playerId);
});

playerListElement.addEventListener("keydown", (event) => {
  const playerRow = event.target.closest(".player-row[data-player-id]");
  if (playerRow && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openScoutPanel(playerRow.dataset.playerId);
  }
});

spectatorBuildGrid.addEventListener("click", (event) => {
  const builderCard = event.target.closest(".spectator-builder[data-player-id]");
  if (builderCard) openScoutPanel(builderCard.dataset.playerId);
});

spectatorBuildGrid.addEventListener("keydown", (event) => {
  const builderCard = event.target.closest(".spectator-builder[data-player-id]");
  if (builderCard && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openScoutPanel(builderCard.dataset.playerId);
  }
});

spectatorCombatGrid.addEventListener("click", (event) => {
  const recapTrigger = event.target.closest("[data-spectator-recap-index]");
  if (!recapTrigger) return;
  const result = gameState.combatResults[Number(recapTrigger.dataset.spectatorRecapIndex)];
  if (!result) return;
  gameState.viewedCombatResult = result;
  openCombatRecap();
});

closeScoutButtons.forEach((button) => button.addEventListener("click", closeScoutPanel));
combatRecapButton.addEventListener("click", openCombatRecap);
closeCombatRecapButtons.forEach((button) => button.addEventListener("click", () => closeCombatRecap()));
combatRecapContinue.addEventListener("click", () => closeCombatRecap({ continueMatch: true }));
spectateMatchButton.addEventListener("click", beginSpectatorMode);
spectatorPrevious.addEventListener("click", () => cycleSpectatedBattle(-1));
spectatorNext.addEventListener("click", () => cycleSpectatedBattle(1));

rerollButton.addEventListener("click", rerollShop);
freezeShopButton.addEventListener("click", toggleShopFreeze);
upgradeShopButton.addEventListener("click", upgradeShopTier);
readyButton.addEventListener("click", toggleHumanReady);
brandExit.addEventListener("click", (event) => {
  event.preventDefault();
  openLeaveGameModal(brandExit);
});
leaveGameButton.addEventListener("click", () => openLeaveGameModal(leaveGameButton));
stayInGameButton.addEventListener("click", closeLeaveGameModal);
closeLeaveModalButtons.forEach((button) => button.addEventListener("click", closeLeaveGameModal));
document.addEventListener("keydown", handleModalKeyboard);

async function initializeGame() {
  await Promise.all([assignRandomAiNames(), loadHeroAbilities(), loadHeroTraits()]);
  initializeRandomShop();
  renderRoster();
  startBuildTimer();
}

initializeGame();
