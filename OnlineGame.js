"use strict";

const crypto = require("crypto");
const heroData = require("./data/online-heroes.json");
const abilityData = require("./data/hero-abilities.json");
const traitData = require("./data/hero-traits.json");
const aiNameData = require("./data/ai-names.json");

const heroes = heroData.heroes;
const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
const abilities = abilityData.abilities || {};
const traitDefinitions = traitData.traits || {};
const heroTraits = traitData.heroes || {};
const aiNames = aiNameData.names || [];

const PLAYER_COUNT = 8;
const TEAM_SIZE = 6;
const BENCH_SIZE = 6;
const MAX_LEVEL = 4;
const WAIT_DURATION_MS = 12_000;
const BUILD_DURATION_MS = 60_000;
const COMBAT_DURATION_MS = 14_000;
const DISCONNECT_TAKEOVER_MS = 25_000;
const LEVEL_MULTIPLIERS = [1, 1.5, 2.25, 3.25];
const UPGRADE_COSTS = { 1: 4, 2: 6, 3: 8 };

function nowIso(now = Date.now()) {
    return new Date(now).toISOString();
}

function randomId() {
    return crypto.randomUUID();
}

function randomToken() {
    return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function hashNumber(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function nextRandom(state, label = "") {
    state.sequence = (Number(state.sequence) || 0) + 1;
    let value = hashNumber(`${state.seed}:${state.sequence}:${label}`);
    value += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function shuffled(state, entries, label) {
    const copy = [...entries];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const target = Math.floor(nextRandom(state, `${label}-${index}`) * (index + 1));
        [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
}

function cleanDisplayName(value) {
    const name = String(value || "Guest").replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 24);
    return name || "Guest";
}

function uniqueDisplayName(state, requestedName) {
    const used = new Set(state.players.map((player) => player.name.toLowerCase()));
    const base = cleanDisplayName(requestedName);
    if (!used.has(base.toLowerCase())) return base;
    let suffix = 2;
    while (used.has(`${base}${suffix}`.toLowerCase())) suffix += 1;
    return `${base}${suffix}`.slice(0, 24);
}

function emptySlots(count) {
    return Array(count).fill(null);
}

function createHumanPlayer(state, requestedName, now = Date.now()) {
    const token = randomToken();
    const player = {
        id: randomId(),
        tokenHash: hashToken(token),
        name: uniqueDisplayName(state, requestedName),
        seat: state.players.length,
        isAI: false,
        wasHuman: true,
        connected: true,
        lastSeenAt: nowIso(now),
        hp: 100,
        credits: 10,
        shopTier: 1,
        shop: [null, null, null],
        team: emptySlots(TEAM_SIZE),
        bench: emptySlots(BENCH_SIZE),
        ready: false,
        frozen: false,
        eliminated: false,
        status: "Connecting",
    };
    state.players.push(player);
    return { player, token };
}

function createInitialState(requestedName, now = Date.now()) {
    const state = {
        id: randomId(),
        seed: crypto.randomBytes(12).toString("hex"),
        sequence: 0,
        status: "waiting",
        phase: "waiting",
        round: 0,
        createdAt: nowIso(now),
        fillAt: nowIso(now + WAIT_DURATION_MS),
        phaseEndsAt: nowIso(now + WAIT_DURATION_MS),
        players: [],
        pairings: [],
        combatResults: [],
        championId: null,
        message: "Searching for live commanders",
    };
    const credentials = createHumanPlayer(state, requestedName, now);
    return { state, credentials };
}

function addHumanToWaitingState(state, requestedName, now = Date.now()) {
    if (state.status !== "waiting" || state.players.length >= PLAYER_COUNT || Date.parse(state.fillAt) <= now) {
        return null;
    }
    const credentials = createHumanPlayer(state, requestedName, now);
    state.message = `${state.players.length}/${PLAYER_COUNT} commanders linked`;
    if (state.players.length >= PLAYER_COUNT) startBuild(state, now);
    return { state, credentials };
}

function chooseAiName(state) {
    const used = new Set(state.players.map((player) => player.name.toLowerCase()));
    return aiNames.find((name) => !used.has(name.toLowerCase())) || `CombatAI-${state.players.length + 1}`;
}

function createAiPlayer(state, now = Date.now()) {
    const name = chooseAiName(state);
    return {
        id: randomId(),
        tokenHash: null,
        name,
        seat: state.players.length,
        isAI: true,
        wasHuman: false,
        connected: true,
        lastSeenAt: nowIso(now),
        hp: 100,
        credits: 10,
        shopTier: 1,
        shop: [null, null, null],
        team: emptySlots(TEAM_SIZE),
        bench: emptySlots(BENCH_SIZE),
        ready: true,
        frozen: false,
        eliminated: false,
        status: "AI tactical planning",
    };
}

function availableHeroes(tier) {
    return heroes.filter((hero) => hero.tier <= Math.max(1, Math.min(4, tier)));
}

function rollShop(state, tier, preserved = []) {
    const pool = availableHeroes(tier);
    return Array.from({ length: 3 }, (_, index) => preserved[index]
        || pool[Math.floor(nextRandom(state, `shop-${tier}-${index}`) * pool.length)].id);
}

function heroInstance(id, level = 1) {
    return { id, level: Math.max(1, Math.min(MAX_LEVEL, Number(level) || 1)) };
}

function allRosterSlots(player) {
    return [
        ...player.team.map((hero, index) => ({ zone: "team", index, hero })),
        ...player.bench.map((hero, index) => ({ zone: "bench", index, hero })),
    ];
}

function mergeRoster(player) {
    const merges = [];
    let didMerge = true;
    while (didMerge) {
        didMerge = false;
        const slots = allRosterSlots(player).filter((slot) => slot.hero && slot.hero.level < MAX_LEVEL);
        for (const first of slots) {
            const second = slots.find((slot) => slot !== first
                && slot.hero.id === first.hero.id
                && slot.hero.level === first.hero.level);
            if (!second) continue;
            const nextLevel = first.hero.level + 1;
            player[first.zone][first.index] = heroInstance(first.hero.id, nextLevel);
            player[second.zone][second.index] = null;
            merges.push({ id: first.hero.id, level: nextLevel });
            didMerge = true;
            break;
        }
    }
    return merges;
}

function traitCounts(team) {
    const counts = new Map();
    team.filter(Boolean).forEach((hero) => {
        (heroTraits[hero.id] || []).forEach((trait) => {
            if (!counts.has(trait)) counts.set(trait, new Set());
            counts.get(trait).add(hero.id);
        });
    });
    return new Map([...counts].map(([trait, ids]) => [trait, ids.size]));
}

function activeTraitEffects(hero, team) {
    const counts = traitCounts(team);
    const effects = {};
    (heroTraits[hero.id] || []).forEach((traitId) => {
        const definition = traitDefinitions[traitId];
        let active = null;
        (definition?.tiers || []).forEach((tier) => {
            if ((counts.get(traitId) || 0) >= tier.threshold) active = tier;
        });
        Object.entries(active?.effects || {}).forEach(([key, value]) => {
            if (typeof value === "number") effects[key] = (effects[key] || 0) + value;
        });
    });
    return effects;
}

function combinedEffects(...sets) {
    return sets.reduce((result, set) => {
        Object.entries(set || {}).forEach(([key, value]) => {
            if (typeof value === "number") result[key] = (result[key] || 0) + value;
        });
        return result;
    }, {});
}

function combatFighter(instance, team, side, index) {
    const catalog = heroById.get(instance.id);
    const multiplier = LEVEL_MULTIPLIERS[(instance.level || 1) - 1];
    const effects = combinedEffects(abilities[instance.id]?.effects, activeTraitEffects(instance, team));
    const power = Math.max(1, Math.round(catalog.power * multiplier) + (effects.bonusPower || 0));
    const maxHealth = Math.max(1, Math.round(catalog.health * multiplier) + (effects.bonusHealth || 0));
    return {
        id: instance.id,
        name: catalog.name,
        abilityName: abilities[instance.id]?.name || "Standard Attack",
        level: instance.level || 1,
        side,
        index,
        power,
        maxHealth,
        health: maxHealth,
        effects,
        attacks: 0,
        revived: false,
        enraged: false,
    };
}

function living(fighters) {
    return fighters.filter((fighter) => fighter.health > 0);
}

function simulateCombat(state, firstPlayer, secondPlayer, label) {
    const firstTeam = firstPlayer.team.filter(Boolean);
    const secondTeam = secondPlayer.team.filter(Boolean);
    const first = firstTeam.map((hero, index) => combatFighter(hero, firstTeam, "first", index));
    const second = secondTeam.map((hero, index) => combatFighter(hero, secondTeam, "second", index));
    const events = [];
    let actingSide = nextRandom(state, `${label}-initiative`) < 0.5 ? "first" : "second";
    let turns = 0;

    if (!first.length || !second.length) {
        return {
            winnerId: first.length ? firstPlayer.id : (second.length ? secondPlayer.id : null),
            loserId: first.length ? secondPlayer.id : (second.length ? firstPlayer.id : null),
            draw: !first.length && !second.length,
            survivors: Math.max(first.length, second.length),
            events,
            teams: { first, second },
        };
    }

    while (living(first).length && living(second).length && turns < 120) {
        const attackers = actingSide === "first" ? living(first) : living(second);
        const defenders = actingSide === "first" ? living(second) : living(first);
        const attacker = attackers[turns % attackers.length];
        const defender = defenders[0];
        const attackerHealthBefore = attacker.health;
        const defenderHealthBefore = defender.health;
        attacker.attacks += 1;

        if (!defender.enraged && defender.effects.enrageThreshold
            && defender.health / defender.maxHealth <= defender.effects.enrageThreshold) {
            defender.enraged = true;
            defender.power += defender.effects.enragePower || 0;
            defender.health = Math.min(defender.maxHealth, defender.health + (defender.effects.enrageHeal || 0));
            events.push({
                type: "ability",
                actor: defender.name,
                actorSide: defender.side,
                actorIndex: defender.index,
                actorHealth: defender.health,
                actorMaxHealth: defender.maxHealth,
                abilityName: abilities[defender.id]?.name || "Combat Protocol",
                text: `${defender.name} transformed under pressure`,
            });
        }

        const dodged = nextRandom(state, `${label}-dodge-${turns}`) < (defender.effects.dodgeChance || 0);
        let damage = 0;
        let critical = false;
        let healing = 0;
        let retaliationDamage = 0;
        if (!dodged) {
            critical = nextRandom(state, `${label}-crit-${turns}`) < (attacker.effects.critChance || 0);
            damage = attacker.power;
            if (attacker.attacks === 1) damage += attacker.effects.firstStrikeBonus || 0;
            if (critical) damage += attacker.effects.critDamage || Math.ceil(attacker.power * 0.5);
            if (attacker.effects.missingHealthDamage) {
                damage += Math.round(attacker.effects.missingHealthDamage * (1 - attacker.health / attacker.maxHealth));
            }
            damage += (attacker.effects.attackRamp || 0) * Math.max(0, attacker.attacks - 1);
            if (attacker.effects.bonusAttackEvery && attacker.attacks % attacker.effects.bonusAttackEvery === 0) {
                damage += attacker.effects.bonusAttackDamage || 0;
            }
            if (attacker.effects.executeThreshold && defender.health / defender.maxHealth <= attacker.effects.executeThreshold) {
                damage += attacker.effects.executeBonus || 0;
            }
            damage = Math.max(1, Math.round(damage - (defender.effects.damageReduction || 0)));
            defender.health = Math.max(0, defender.health - damage);
            if (attacker.effects.lifesteal) {
                const beforeHeal = attacker.health;
                attacker.health = Math.min(attacker.maxHealth, attacker.health + Math.max(1, Math.round(damage * attacker.effects.lifesteal)));
                healing += attacker.health - beforeHeal;
            }
            if (defender.effects.thorns) {
                retaliationDamage = Math.min(attacker.health, defender.effects.thorns);
                attacker.health = Math.max(0, attacker.health - retaliationDamage);
            }
        }

        let revived = false;
        if (defender.health <= 0 && defender.effects.reviveHealth && !defender.revived) {
            defender.revived = true;
            defender.health = Math.min(defender.maxHealth, defender.effects.reviveHealth);
            revived = true;
            events.push({
                type: "ability",
                actor: defender.name,
                actorSide: defender.side,
                actorIndex: defender.index,
                actorHealth: defender.health,
                actorMaxHealth: defender.maxHealth,
                abilityName: abilities[defender.id]?.name || "Combat Protocol",
                text: `${defender.name} returned to combat`,
            });
        }

        if (defender.health <= 0 && attacker.effects.onKillHeal) {
            const beforeHeal = attacker.health;
            attacker.health = Math.min(attacker.maxHealth, attacker.health + attacker.effects.onKillHeal);
            healing += attacker.health - beforeHeal;
        }

        if (attacker.effects.periodicHealEvery && attacker.attacks % attacker.effects.periodicHealEvery === 0) {
            const beforeHeal = attacker.health;
            attacker.health = Math.min(attacker.maxHealth, attacker.health + (attacker.effects.periodicHeal || 0));
            healing += attacker.health - beforeHeal;
        }

        events.push({
            type: dodged ? "dodge" : (defender.health <= 0 ? "knockout" : "attack"),
            actor: attacker.name,
            target: defender.name,
            actorSide: attacker.side,
            actorIndex: attacker.index,
            targetSide: defender.side,
            targetIndex: defender.index,
            damage,
            critical,
            dodged,
            revived,
            targetHealthBefore: defenderHealthBefore,
            targetHealth: defender.health,
            targetMaxHealth: defender.maxHealth,
            actorHealthBefore: attackerHealthBefore,
            actorHealth: attacker.health,
            actorMaxHealth: attacker.maxHealth,
            healing,
            retaliationDamage,
            abilityName: abilities[attacker.id]?.name || "Standard Attack",
            text: dodged ? `${defender.name} evaded` : `${attacker.name} hit ${defender.name} for ${damage}`,
        });
        actingSide = actingSide === "first" ? "second" : "first";
        turns += 1;
    }

    const firstAlive = living(first).length;
    const secondAlive = living(second).length;
    const draw = firstAlive === secondAlive;
    const winnerId = draw ? null : (firstAlive > secondAlive ? firstPlayer.id : secondPlayer.id);
    const loserId = draw ? null : (winnerId === firstPlayer.id ? secondPlayer.id : firstPlayer.id);
    return {
        winnerId,
        loserId,
        draw,
        survivors: Math.max(firstAlive, secondAlive),
        events: events.slice(0, 80),
        teams: { first, second },
    };
}

function aiCandidateScore(hero, player) {
    const owned = player.team.filter(Boolean);
    const counts = traitCounts(owned);
    const overlap = (heroTraits[hero.id] || []).reduce((score, trait) => score + (counts.get(trait) || 0) * 5, 0);
    const duplicate = owned.some((entry) => entry.id === hero.id && entry.level < MAX_LEVEL) ? 7 : 0;
    return hero.power + hero.health * 0.65 + overlap + duplicate + hero.tier;
}

function buildAiTeam(state, player) {
    const targetSize = Math.min(TEAM_SIZE, state.round + 2);
    player.shopTier = Math.min(4, 1 + Math.floor((state.round - 1) / 2));
    let safety = 0;
    while (player.team.filter(Boolean).length < targetSize && safety < 30) {
        const candidates = availableHeroes(player.shopTier)
            .map((hero) => ({ hero, score: aiCandidateScore(hero, player) + nextRandom(state, `ai-${player.id}-${safety}`) * 8 }))
            .sort((a, b) => b.score - a.score);
        const selection = candidates[Math.min(candidates.length - 1, Math.floor(nextRandom(state, `ai-pick-${safety}`) * 3))].hero;
        const openIndex = player.team.findIndex((hero) => !hero);
        player.team[openIndex] = heroInstance(selection.id);
        mergeRoster(player);
        safety += 1;
    }
    player.ready = true;
    player.status = `AI locked ${player.team.filter(Boolean).length}/6`;
}

function fillWithAi(state, now = Date.now()) {
    while (state.players.length < PLAYER_COUNT) state.players.push(createAiPlayer(state, now));
}

function startBuild(state, now = Date.now()) {
    fillWithAi(state, now);
    state.status = "active";
    state.phase = "build";
    state.round = Math.max(1, state.round || 1);
    state.phaseEndsAt = nowIso(now + BUILD_DURATION_MS);
    state.pairings = [];
    state.combatResults = [];
    state.message = `Round ${state.round} build phase`;

    state.players.filter((player) => !player.eliminated).forEach((player) => {
        player.ready = false;
        if (player.isAI) {
            buildAiTeam(state, player);
            return;
        }
        const preserved = player.frozen ? player.shop : [];
        player.shop = rollShop(state, player.shopTier, preserved);
        player.frozen = false;
        player.status = "Building live";
    });
}

function createPairings(state) {
    const alive = shuffled(state, state.players.filter((player) => !player.eliminated), `pairing-${state.round}`);
    const pairs = [];
    while (alive.length >= 2) pairs.push([alive.shift(), alive.shift()]);
    if (alive.length) {
        const lone = alive.shift();
        const ghostSource = state.players.find((player) => player.id !== lone.id && player.team.some(Boolean));
        const ghost = ghostSource
            ? { ...ghostSource, id: `ghost-${state.round}-${ghostSource.id}`, name: `${ghostSource.name} Echo`, isGhost: true }
            : { ...createAiPlayer(state), id: `ghost-${state.round}`, name: "Training Echo", isGhost: true };
        pairs.push([lone, ghost]);
    }
    return pairs;
}

function resolveCombat(state, now = Date.now()) {
    state.phase = "combat";
    state.phaseEndsAt = nowIso(now + COMBAT_DURATION_MS);
    state.pairings = createPairings(state).map((pair) => pair.map((player) => player.id));
    state.combatResults = [];

    createPairingsFromIds(state).forEach(([first, second], index) => {
        const result = simulateCombat(state, first, second, `round-${state.round}-${index}`);
        const damage = Math.min(35, 8 + state.round * 2 + result.survivors * 3);
        if (result.loserId && !String(result.loserId).startsWith("ghost-")) {
            const loser = state.players.find((player) => player.id === result.loserId);
            if (loser) {
                loser.hp = Math.max(0, loser.hp - damage);
                loser.eliminated = loser.hp <= 0;
                loser.ready = false;
                loser.status = loser.eliminated ? "Eliminated" : `Lost ${damage} HP`;
            }
        }
        state.combatResults.push({
            id: `${state.round}-${index}`,
            firstId: first.id,
            secondId: second.id,
            firstName: first.name,
            secondName: second.name,
            winnerId: result.winnerId,
            loserId: result.loserId,
            draw: result.draw,
            damage,
            survivors: result.survivors,
            events: result.events,
            teams: result.teams,
        });
    });
    state.message = `Round ${state.round} combat live`;
}

function createPairingsFromIds(state) {
    return state.pairings.map(([firstId, secondId]) => {
        const first = state.players.find((player) => player.id === firstId);
        let second = state.players.find((player) => player.id === secondId);
        if (!second && String(secondId).startsWith("ghost-")) {
            const sourceId = String(secondId).split("-").slice(2).join("-");
            const source = state.players.find((player) => player.id === sourceId);
            second = source
                ? { ...source, id: secondId, name: `${source.name} Echo`, isGhost: true }
                : { ...createAiPlayer(state), id: secondId, name: "Training Echo", isGhost: true };
        }
        return [first, second];
    }).filter((pair) => pair.every(Boolean));
}

function beginNextRound(state, now = Date.now()) {
    const alive = state.players.filter((player) => !player.eliminated);
    if (alive.length <= 1) {
        state.status = "complete";
        state.phase = "complete";
        state.phaseEndsAt = null;
        state.championId = alive[0]?.id || null;
        state.message = alive[0] ? `${alive[0].name} is the last commander standing` : "No commander survived";
        return;
    }

    state.round += 1;
    alive.forEach((player) => {
        player.credits = Math.min(30, player.credits + 7);
        player.ready = false;
    });
    startBuild(state, now);
}

function allHumansReady(state) {
    const humans = state.players.filter((player) => !player.eliminated && !player.isAI);
    return humans.length > 0 && humans.every((player) => player.ready);
}

function applyDisconnectTakeovers(state, now = Date.now()) {
    if (state.phase !== "build") return;
    state.players.filter((player) => !player.eliminated && player.wasHuman && !player.isAI).forEach((player) => {
        if (now - Date.parse(player.lastSeenAt) > DISCONNECT_TAKEOVER_MS) {
            player.isAI = true;
            player.connected = false;
            player.status = "AI takeover";
            buildAiTeam(state, player);
        }
    });
}

function advanceState(state, now = Date.now(), { forceStart = false } = {}) {
    if (state.phase === "waiting" && (forceStart || state.players.length >= PLAYER_COUNT || now >= Date.parse(state.fillAt))) {
        startBuild(state, now);
    }
    applyDisconnectTakeovers(state, now);
    if (state.phase === "build" && (now >= Date.parse(state.phaseEndsAt) || allHumansReady(state))) {
        resolveCombat(state, now);
    } else if (state.phase === "combat" && now >= Date.parse(state.phaseEndsAt)) {
        beginNextRound(state, now);
    }
    return state;
}

function requireBuildPhase(state, player) {
    if (state.phase !== "build" || player.eliminated) {
        const error = new Error("Roster actions are only available during an active build phase.");
        error.code = "ONLINE_ACTION_LOCKED";
        throw error;
    }
}

function rosterZone(player, zone) {
    if (zone === "team") return player.team;
    if (zone === "bench") return player.bench;
    const error = new Error("Invalid roster zone.");
    error.code = "ONLINE_BAD_ACTION";
    throw error;
}

function applyPlayerAction(state, player, action, payload = {}) {
    if (action === "start-now") {
        if (state.phase !== "waiting") return;
        advanceState(state, Date.now(), { forceStart: true });
        return;
    }

    requireBuildPhase(state, player);

    if (action === "ready") {
        player.ready = !player.ready;
        player.status = player.ready ? "Ready for combat" : "Building live";
        return;
    }

    player.ready = false;
    player.status = "Building live";

    if (action === "buy") {
        const index = Number(payload.index);
        const heroId = player.shop[index];
        const hero = heroById.get(heroId);
        if (!hero || !Number.isInteger(index) || index < 0 || index > 2) throw Object.assign(new Error("That shop offer is unavailable."), { code: "ONLINE_BAD_ACTION" });
        if (player.credits < hero.cost) throw Object.assign(new Error("Not enough credits."), { code: "ONLINE_NO_CREDITS" });
        let zone = player.team;
        let openIndex = zone.findIndex((entry) => !entry);
        if (openIndex < 0) {
            zone = player.bench;
            openIndex = zone.findIndex((entry) => !entry);
        }
        if (openIndex < 0) throw Object.assign(new Error("Your team and sideline are full."), { code: "ONLINE_ROSTER_FULL" });
        player.credits -= hero.cost;
        zone[openIndex] = heroInstance(heroId);
        player.shop[index] = null;
        const merges = mergeRoster(player);
        player.status = merges.length ? `${hero.name} merged to level ${merges.at(-1).level}` : `${hero.name} recruited`;
        return;
    }

    if (action === "reroll") {
        if (player.credits < 1) throw Object.assign(new Error("Rerolling costs 1 credit."), { code: "ONLINE_NO_CREDITS" });
        player.credits -= 1;
        player.shop = rollShop(state, player.shopTier);
        player.frozen = false;
        player.status = "Armory rerolled";
        return;
    }

    if (action === "upgrade") {
        const cost = UPGRADE_COSTS[player.shopTier];
        if (!cost) throw Object.assign(new Error("The shop is already at maximum tier."), { code: "ONLINE_MAX_TIER" });
        if (player.credits < cost) throw Object.assign(new Error(`Tier upgrade costs ${cost} credits.`), { code: "ONLINE_NO_CREDITS" });
        player.credits -= cost;
        player.shopTier += 1;
        player.status = `Shop upgraded to tier ${player.shopTier}`;
        return;
    }

    if (action === "freeze") {
        player.frozen = !player.frozen;
        player.status = player.frozen ? "Shop frozen" : "Shop released";
        return;
    }

    if (action === "move") {
        const from = rosterZone(player, payload.fromZone);
        const to = rosterZone(player, payload.toZone);
        const fromIndex = Number(payload.fromIndex);
        const toIndex = Number(payload.toIndex);
        if (![fromIndex, toIndex].every((index) => Number.isInteger(index) && index >= 0 && index < TEAM_SIZE)) {
            throw Object.assign(new Error("Invalid roster position."), { code: "ONLINE_BAD_ACTION" });
        }
        [to[toIndex], from[fromIndex]] = [from[fromIndex], to[toIndex]];
        mergeRoster(player);
        player.status = "Formation updated";
        return;
    }

    if (action === "sell") {
        const zone = rosterZone(player, payload.zone);
        const index = Number(payload.index);
        const instance = zone[index];
        const hero = heroById.get(instance?.id);
        if (!hero || !Number.isInteger(index)) throw Object.assign(new Error("Select a hero to sell."), { code: "ONLINE_BAD_ACTION" });
        const copies = 2 ** Math.max(0, (instance.level || 1) - 1);
        player.credits = Math.min(30, player.credits + Math.max(1, Math.floor(hero.cost * copies * 0.6)));
        zone[index] = null;
        player.status = `${hero.name} sold`;
        return;
    }

    throw Object.assign(new Error("Unknown online action."), { code: "ONLINE_BAD_ACTION" });
}

function findPlayerByToken(state, playerId, token) {
    const player = state.players.find((entry) => entry.id === playerId);
    if (!player || !player.tokenHash || player.tokenHash !== hashToken(token)) return null;
    return player;
}

function touchPlayer(player, now = Date.now()) {
    player.lastSeenAt = nowIso(now);
    player.connected = true;
    if (player.wasHuman && player.isAI && !player.eliminated) {
        player.isAI = false;
        player.status = "Reconnected";
        player.ready = false;
    }
}

function publicHero(instance) {
    if (!instance) return null;
    const catalog = heroById.get(instance.id);
    return catalog ? { ...catalog, level: instance.level || 1, traits: heroTraits[instance.id] || [], ability: abilities[instance.id] || null } : null;
}

function publicPlayer(player) {
    return {
        id: player.id,
        name: player.name,
        seat: player.seat,
        isAI: player.isAI,
        wasHuman: player.wasHuman,
        connected: player.connected,
        hp: player.hp,
        ready: player.ready,
        eliminated: player.eliminated,
        status: player.status,
        team: player.team.map(publicHero),
    };
}

function publicState(state, viewerId) {
    const viewer = state.players.find((player) => player.id === viewerId);
    return {
        id: state.id,
        status: state.status,
        phase: state.phase,
        round: state.round,
        phaseEndsAt: state.phaseEndsAt,
        fillAt: state.fillAt,
        message: state.message,
        championId: state.championId,
        players: state.players.map(publicPlayer),
        pairings: state.pairings,
        combatResults: state.combatResults,
        me: viewer ? {
            ...publicPlayer(viewer),
            credits: viewer.credits,
            shopTier: viewer.shopTier,
            frozen: viewer.frozen,
            shop: viewer.shop.map((id) => publicHero(id ? heroInstance(id) : null)),
            bench: viewer.bench.map(publicHero),
        } : null,
        serverTime: nowIso(),
        transport: "live-sync",
    };
}

module.exports = {
    PLAYER_COUNT,
    WAIT_DURATION_MS,
    createInitialState,
    addHumanToWaitingState,
    advanceState,
    applyPlayerAction,
    findPlayerByToken,
    touchPlayer,
    publicState,
    hashToken,
    _internals: { mergeRoster, simulateCombat, buildAiTeam, traitCounts, get heroes() { return heroes; } },
};
