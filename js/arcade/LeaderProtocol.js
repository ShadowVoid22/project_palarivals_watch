(() => {
  "use strict";

  const DATA_SOURCE = "data/leader-protocol.json";
  const COMBAT_BEAT = 620;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
  })[character]);

  const dom = {
    operation: $("#operationLabel"), health: $("#healthValue"), round: $("#roundValue"),
    timer: $("#timerValue"), credits: $("#creditValue"), signal: $("#signalLabel"),
    unitCount: $("#unitCount"), ready: $("#readyButton"), console: $("#leaderConsole"),
    board: $("#teamBoard"), shop: $("#shopGrid"), reroll: $("#rerollButton"),
    online: $("#onlineCount"), players: $("#playerList"), readyCount: $("#readyCount"),
    draft: $("#leaderDraft"), leaderOptions: $("#leaderOptions"),
    build: $("#buildView"), combat: $("#combatView"), combatKicker: $("#combatKicker"),
    combatTitle: $("#combatTitle"), combatEvent: $("#combatEvent"), combatFx: $("#combatFx"),
    playerCombat: $("#playerCombatTeam"), enemyCombat: $("#enemyCombatTeam"),
    playerUnits: $("#playerUnitsLeft"), enemyUnits: $("#enemyUnitsLeft"), enemyName: $("#enemyName"),
    combatFeed: $("#combatFeed"), combatLog: $("#combatLog"),
    rulesButton: $("#rulesButton"), rules: $("#rulesPanel"), result: $("#roundResult"),
    resultKicker: $("#resultKicker"), resultTitle: $("#resultTitle"), resultDetail: $("#resultDetail"),
    resultHealth: $("#resultHealth"), resultRemaining: $("#resultRemaining"),
    continueButton: $("#continueButton"), returnButton: $("#returnButton"),
    inspector: $("#unitInspector"), announcer: $("#announcer")
  };

  let data;
  let buildTimer;
  let aiTimers = [];
  let announceTimer;
  let uid = 0;

  const state = {
    phase: "loading", round: 1, credits: 0, seconds: 0, selectedLeader: null,
    team: [], shop: [], players: [], draftChoices: [], selectedSlot: null,
    currentCombat: null, gameOver: false
  };

  function heroDefinition(id) {
    return data.heroes.find((hero) => hero.id === id);
  }

  function leaderDefinition(heroId) {
    return data.leaders.find((leader) => leader.heroId === heroId);
  }

  function makeUnit(hero, isLeader = false) {
    return {
      uid: `lp-${++uid}`, heroId: hero.id, name: hero.name, image: hero.image, logo: hero.logo,
      traits: [...hero.traits], power: hero.power, health: hero.health, cost: hero.cost,
      ability: JSON.parse(JSON.stringify(hero.ability)), isLeader
    };
  }

  function relationship(unit, leader) {
    if (!unit || !leader) return "neutral";
    if (unit.isLeader || unit.heroId === leader.heroId) return "leader";
    if (unit.traits.some((trait) => leader.opposed.includes(trait))) return "conflict";
    if (unit.traits.some((trait) => leader.favored.includes(trait))) return "inspired";
    return "neutral";
  }

  function relationLabel(relation) {
    return { leader: "Crowned", inspired: "Inspired", conflict: "Conflict", neutral: "Unaffiliated" }[relation];
  }

  function ascensionLevel(round = state.round) {
    return 1 + Math.floor((round - 1) / data.rules.leaderAscendsEvery);
  }

  function linkInfo(team, leader) {
    const count = team.filter((unit) => ["leader", "inspired"].includes(relationship(unit, leader))).length;
    const active = [...data.commandLink.tiers].reverse().find((tier) => count >= tier.threshold) || null;
    return { count, active };
  }

  function addEffects(target, source = {}) {
    Object.entries(source).forEach(([key, value]) => {
      if (!["powerMultiplier", "healthMultiplier"].includes(key)) target[key] = (target[key] || 0) + value;
    });
  }

  function effectiveUnit(unit, team, leader, round = state.round) {
    const relation = relationship(unit, leader);
    const effects = {};
    addEffects(effects, unit.ability.effects);

    let powerMultiplier = 1;
    let healthMultiplier = 1;
    if (relation === "leader") {
      const climb = ascensionLevel(round) - 1;
      powerMultiplier *= leader.leaderEffects.powerMultiplier || 1;
      healthMultiplier *= leader.leaderEffects.healthMultiplier || 1;
      addEffects(effects, leader.leaderEffects);
      addEffects(effects, leader.ultimate.effects);
      effects.bonusPower = (effects.bonusPower || 0) + climb * 3;
      effects.bonusHealth = (effects.bonusHealth || 0) + climb * 5;
      effects.firstStrikeBonus = (effects.firstStrikeBonus || 0) + climb * 2;
      effects.critChance = (effects.critChance || 0) + climb * 0.03;
    } else if (relation === "inspired") {
      addEffects(effects, leader.favoredEffects);
    } else if (relation === "conflict") {
      addEffects(effects, leader.opposedEffects);
    }

    const link = linkInfo(team, leader);
    if (["leader", "inspired"].includes(relation) && link.active) addEffects(effects, link.active.effects);

    const power = Math.max(1, Math.round(unit.power * powerMultiplier + (effects.bonusPower || 0)));
    const maxHealth = Math.max(1, Math.round(unit.health * healthMultiplier + (effects.bonusHealth || 0)));
    return {
      ...unit, relation, power, maxHealth, effects: {
        ...effects,
        dodgeChance: clamp(effects.dodgeChance || 0, 0, 0.72),
        critChance: clamp(effects.critChance || 0, 0, 0.8),
        lifesteal: clamp(effects.lifesteal || 0, 0, 0.9),
        damageReduction: Math.max(0, effects.damageReduction || 0),
        thorns: Math.max(0, effects.thorns || 0)
      }
    };
  }

  function initials(name) {
    return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }

  function announce(message) {
    window.clearTimeout(announceTimer);
    dom.announcer.textContent = message;
    dom.announcer.classList.add("lp-announcer--visible");
    announceTimer = window.setTimeout(() => dom.announcer.classList.remove("lp-announcer--visible"), 2400);
  }

  function formatClock(seconds) {
    return `00:${String(Math.max(0, seconds)).padStart(2, "0")}`;
  }

  function chooseUniqueAiNames() {
    return shuffle(data.aiNames).slice(0, 7);
  }

  function pickAiUnit(player) {
    const candidates = data.heroes.filter((hero) => hero.id !== player.leader.heroId);
    const weighted = candidates.flatMap((hero) => {
      const probe = makeUnit(hero);
      const relation = relationship(probe, player.leader);
      const copies = relation === "inspired" ? 7 : relation === "neutral" ? 2 : 1;
      return Array(copies).fill(hero);
    });
    return makeUnit(weighted[Math.floor(Math.random() * weighted.length)]);
  }

  function createLobby() {
    const names = chooseUniqueAiNames();
    const aiPlayers = names.map((name, index) => {
      const leader = data.leaders[Math.floor(Math.random() * data.leaders.length)];
      const team = Array(data.rules.teamSlots).fill(null);
      team[0] = makeUnit(heroDefinition(leader.heroId), true);
      return {
        id: `ai-${index}`, name, initials: initials(name), hp: data.rules.startingHealth,
        leader, team, ready: false, eliminated: false, human: false, status: "Selecting doctrine"
      };
    });
    state.players = [{
      id: "human", name: "You", initials: "YO", hp: data.rules.startingHealth,
      leader: null, team: state.team, ready: false, eliminated: false, human: true, status: "Choosing leader"
    }, ...aiPlayers];
  }

  function renderLeaderDraft() {
    state.draftChoices = shuffle(data.leaders).slice(0, 3);
    dom.leaderOptions.innerHTML = state.draftChoices.map((leader, index) => {
      const hero = heroDefinition(leader.heroId);
      const leaderStats = effectiveUnit(makeUnit(hero, true), [makeUnit(hero, true)], leader, 1);
      return `<button class="lp-leader-card" type="button" data-select-leader="${index}">
        <span class="lp-leader-card__number">0${index + 1}</span>
        <span class="lp-leader-card__crown">LEADER</span>
        <img src="${hero.image}" alt="${escapeHtml(hero.name)}">
        <span class="lp-leader-card__content">
          <small>${escapeHtml(leader.title)}</small><strong>${escapeHtml(hero.name)}</strong>
          <span class="lp-leader-card__tags">${leader.favored.map((tag) => `<i>+ ${escapeHtml(tag)}</i>`).join("")} ${leader.opposed.map((tag) => `<i class="is-opposed">- ${escapeHtml(tag)}</i>`).join("")}</span>
          <span class="lp-leader-card__ability"><b>${escapeHtml(leader.ultimate.name)}</b>${escapeHtml(leader.ultimate.description)}</span>
          <span class="lp-leader-card__stats"><b>⚔ ${leaderStats.power}</b><b>♥ ${leaderStats.maxHealth}</b></span>
          <span class="lp-leader-card__select">Install Commander <i>➜</i></span>
        </span>
      </button>`;
    }).join("");
  }

  function selectLeader(index) {
    const leader = state.draftChoices[index];
    if (!leader || state.selectedLeader) return;
    state.selectedLeader = leader;
    state.team[0] = makeUnit(heroDefinition(leader.heroId), true);
    const human = state.players[0];
    human.leader = leader;
    human.status = "Building formation";
    dom.draft.classList.add("lp-leader-draft--closing");
    window.setTimeout(() => {
      dom.draft.hidden = true;
      dom.draft.classList.remove("lp-leader-draft--closing");
    }, 420);
    startBuildPhase(true);
    announce(`${heroDefinition(leader.heroId).name} has taken command.`);
  }

  function renderHud() {
    const human = state.players[0];
    dom.health.textContent = human.hp;
    dom.round.textContent = String(state.round).padStart(2, "0");
    dom.timer.textContent = formatClock(state.seconds);
    dom.credits.textContent = state.credits;
    dom.unitCount.textContent = state.team.filter(Boolean).length;
    dom.operation.textContent = state.selectedLeader?.auraName || "Awaiting Commander";
    dom.signal.textContent = state.selectedLeader ? heroDefinition(state.selectedLeader.heroId).name : "unassigned";
    dom.ready.disabled = state.phase !== "build" || state.players[0].ready;
    dom.ready.classList.toggle("is-ready", state.players[0].ready);
    $("strong", dom.ready).textContent = state.players[0].ready ? "Formation Locked" : "Lock Formation";
  }

  function renderConsole() {
    if (!state.selectedLeader) return;
    const leader = state.selectedLeader;
    const unit = state.team[0];
    const stats = effectiveUnit(unit, state.team, leader);
    const link = linkInfo(state.team, leader);
    const tier = link.active;
    dom.console.innerHTML = `<article class="lp-console">
      <div class="lp-console__identity">
        <span><img src="${unit.image}" alt=""></span><p><small>Active Commander // Ascension ${ascensionLevel()}</small><strong>${escapeHtml(unit.name)}</strong><b>${escapeHtml(leader.title)}</b><em>⚔ ${stats.power} &nbsp; ♥ ${stats.maxHealth} // ${escapeHtml(leader.ultimate.name)}</em></p>
      </div>
      <div class="lp-console__aura"><small>Command Aura</small><strong>${escapeHtml(leader.auraName)}</strong><p>${escapeHtml(leader.auraText)}</p><div class="lp-tags">${leader.favored.map((tag) => `<i class="lp-tag">+ ${escapeHtml(tag)}</i>`).join("")}${leader.opposed.map((tag) => `<i class="lp-tag lp-tag--opposed">- ${escapeHtml(tag)}</i>`).join("")}</div></div>
      <div class="lp-console__link"><header><span><small>Command Link</small><p>${tier ? escapeHtml(tier.name) : "Dormant"}</p></span><strong>${link.count}/6</strong></header><div class="lp-console__meter"><i style="width:${(link.count / 6) * 100}%"></i><b></b><b></b><b></b></div><p>${tier ? escapeHtml(tier.text) : "Recruit one more inspired hero to activate the formation buff."}</p></div>
    </article>`;
  }

  function boardCard(unit, index) {
    if (!unit) return `<button class="lp-slot lp-slot--empty${state.selectedSlot !== null ? " lp-slot--target" : ""}" type="button" data-board-slot="${index}"><span>${index === 0 ? "Leader locked" : `Slot 0${index + 1} // Open`}</span></button>`;
    const relation = relationship(unit, state.selectedLeader);
    const stats = effectiveUnit(unit, state.team, state.selectedLeader);
    return `<article class="lp-slot lp-slot--${relation}${state.selectedSlot === index ? " lp-slot--selected" : ""}" data-board-slot="${index}" data-inspect-team="${index}" tabindex="0">
      <span class="lp-slot__index">0${index + 1}</span><img class="lp-slot__portrait" src="${unit.image}" alt="${escapeHtml(unit.name)}"><img class="lp-slot__logo" src="${unit.logo}" alt="">
      <span class="lp-slot__relation">${relation === "leader" ? "♛ " : ""}${relationLabel(relation)}</span>
      <div class="lp-slot__info"><small>${unit.traits.map(escapeHtml).join(" // ")}</small><strong>${escapeHtml(unit.name)}</strong><span><b>⚔ ${stats.power}</b><b>♥ ${stats.maxHealth}</b></span></div>
      ${unit.isLeader ? `<span class="lp-slot__locked">PERMANENT</span>` : `<button class="lp-slot__sell" type="button" data-sell-slot="${index}" aria-label="Sell ${escapeHtml(unit.name)}">Sell +◆${Math.max(1, Math.floor(unit.cost / 2) + 1)}</button>`}
    </article>`;
  }

  function renderBoard() {
    dom.board.innerHTML = state.team.map(boardCard).join("");
  }

  function renderShop() {
    dom.reroll.disabled = state.phase !== "build" || state.credits < data.rules.rerollCost || state.players[0].ready;
    dom.shop.innerHTML = state.shop.map((offer, index) => {
      const unit = makeUnit(offer.hero);
      const relation = relationship(unit, state.selectedLeader);
      const previewTeam = [...state.team.filter(Boolean), unit].slice(0, 6);
      const stats = effectiveUnit(unit, previewTeam, state.selectedLeader);
      const disabled = offer.sold || state.credits < offer.hero.cost || !state.team.slice(1).includes(null) || state.players[0].ready;
      return `<article class="lp-offer lp-offer--${relation}${offer.sold ? " lp-offer--sold" : ""}" data-inspect-shop="${index}" tabindex="0">
        <span class="lp-offer__number">0${index + 1}</span><img class="lp-offer__portrait" src="${offer.hero.image}" alt="${escapeHtml(offer.hero.name)}"><img class="lp-offer__logo" src="${offer.hero.logo}" alt="">
        <span class="lp-offer__relation">${relationLabel(relation)}</span>
        <div class="lp-offer__content"><small>${offer.hero.traits.map(escapeHtml).join(" // ")}</small><strong>${escapeHtml(offer.hero.name)}</strong><span><b>⚔ ${stats.power}</b><b>♥ ${stats.maxHealth}</b></span><button type="button" data-buy-offer="${index}" ${disabled ? "disabled" : ""}>${offer.sold ? "Recruited" : `Recruit <b>◆ ${offer.hero.cost}</b>`}</button></div>
      </article>`;
    }).join("");
  }

  function renderPlayers() {
    const ordered = [...state.players].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.hp - a.hp);
    dom.players.innerHTML = ordered.map((player, index) => {
      const units = player.team.filter(Boolean).length;
      const hero = player.leader ? heroDefinition(player.leader.heroId) : null;
      return `<li class="lp-player-row${player.human ? " lp-player-row--human" : ""}${player.eliminated ? " lp-player-row--eliminated" : ""}">
        <span class="lp-player-row__rank">${String(index + 1).padStart(2, "0")}</span><span class="lp-player-row__avatar">${player.initials}</span>
        <span class="lp-player-row__identity"><strong>${escapeHtml(player.name)}</strong><small>${player.eliminated ? "Signal lost" : escapeHtml(player.status)}</small></span>
        <span class="lp-player-row__hp"><b>${player.hp}</b><small>${units}/6 units</small></span><span class="lp-player-row__bar"><i style="width:${player.hp}%"></i></span>
      </li>`;
    }).join("");
    const alive = state.players.filter((player) => !player.eliminated).length;
    const ready = state.players.filter((player) => player.ready && !player.eliminated).length;
    dom.online.textContent = alive;
    dom.readyCount.textContent = `${ready}/${alive} ready`;
  }

  function renderAll() {
    renderHud();
    renderConsole();
    renderBoard();
    renderShop();
    renderPlayers();
  }

  function rollShop(free = false) {
    if (!free) {
      if (state.credits < data.rules.rerollCost || state.players[0].ready) return;
      state.credits -= data.rules.rerollCost;
    }
    const pool = shuffle(data.heroes.filter((hero) => hero.id !== state.selectedLeader?.heroId));
    state.shop = pool.slice(0, data.rules.shopSize).map((hero) => ({ hero, sold: false }));
    renderAll();
    if (!free) announce("Reinforcement network refreshed.");
  }

  function buyOffer(index) {
    const offer = state.shop[index];
    if (!offer || offer.sold || state.players[0].ready || state.credits < offer.hero.cost) return;
    const slot = state.team.findIndex((unit, slotIndex) => slotIndex > 0 && !unit);
    if (slot < 0) return announce("Your formation is full. Sell a non-leader hero first.");
    state.credits -= offer.hero.cost;
    state.team[slot] = makeUnit(offer.hero);
    offer.sold = true;
    announce(`${offer.hero.name} joined as ${relationLabel(relationship(state.team[slot], state.selectedLeader))}.`);
    renderAll();
  }

  function sellUnit(index) {
    const unit = state.team[index];
    if (!unit || unit.isLeader || state.players[0].ready) return;
    const refund = Math.max(1, Math.floor(unit.cost / 2) + 1);
    state.credits += refund;
    state.team[index] = null;
    state.selectedSlot = null;
    announce(`${unit.name} dismissed. +${refund} credits.`);
    renderAll();
  }

  function selectBoardSlot(index) {
    if (state.players[0].ready || index === 0) return;
    if (state.selectedSlot === null) {
      if (!state.team[index]) return;
      state.selectedSlot = index;
      announce("Select another slot to reposition this hero.");
    } else {
      [state.team[state.selectedSlot], state.team[index]] = [state.team[index], state.team[state.selectedSlot]];
      state.selectedSlot = null;
      announce("Formation order updated.");
    }
    renderBoard();
  }

  function clearAiTimers() {
    aiTimers.forEach(window.clearTimeout);
    aiTimers = [];
  }

  function finishAiBuild(player) {
    if (player.eliminated) return;
    const target = Math.min(6, 2 + state.round);
    while (player.team.filter(Boolean).length < target) {
      const slot = player.team.findIndex((unit, index) => index > 0 && !unit);
      if (slot < 0) break;
      player.team[slot] = pickAiUnit(player);
    }
    player.ready = true;
    player.status = "Formation locked";
  }

  function scheduleAiBuild() {
    clearAiTimers();
    state.players.slice(1).filter((player) => !player.eliminated).forEach((player, index) => {
      player.ready = false;
      player.status = "Building formation";
      const action = window.setTimeout(() => {
        finishAiBuild(player);
        renderPlayers();
        checkAllReady();
      }, 900 + index * 280 + Math.random() * 900);
      aiTimers.push(action);
    });
  }

  function startBuildPhase(firstRound = false) {
    window.clearInterval(buildTimer);
    clearAiTimers();
    state.phase = "build";
    state.seconds = data.rules.buildSeconds;
    state.credits = firstRound ? data.rules.startingCredits : state.credits;
    state.players.forEach((player) => {
      if (!player.eliminated) {
        player.ready = false;
        player.status = player.human ? "Building formation" : "Reading doctrine";
      }
    });
    dom.result.hidden = true;
    dom.combat.hidden = true;
    dom.build.hidden = false;
    document.body.dataset.audioScene = "build";
    rollShop(true);
    scheduleAiBuild();
    buildTimer = window.setInterval(() => {
      state.seconds -= 1;
      renderHud();
      if (state.seconds <= 0) {
        window.clearInterval(buildTimer);
        lockPlayerAndFight();
      }
    }, 1000);
  }

  function checkAllReady() {
    const alive = state.players.filter((player) => !player.eliminated);
    if (state.phase === "build" && alive.every((player) => player.ready)) beginCombat();
  }

  function lockPlayerAndFight() {
    if (state.phase !== "build") return;
    state.players[0].ready = true;
    state.players[0].status = "Formation locked";
    state.players.slice(1).forEach(finishAiBuild);
    renderAll();
    checkAllReady();
  }

  function fighterTeam(player) {
    return player.team.filter(Boolean).map((unit) => {
      const stats = effectiveUnit(unit, player.team, player.leader);
      return { ...stats, currentHealth: stats.maxHealth, currentPower: stats.power, attacks: 0 };
    });
  }

  function simulateFight(leftPlayer, rightPlayer) {
    const left = fighterTeam(leftPlayer);
    const right = fighterTeam(rightPlayer);
    const initialLeft = left.map((fighter) => ({ ...fighter }));
    const initialRight = right.map((fighter) => ({ ...fighter }));
    const events = [];
    let turn = 0;
    let safety = 0;
    while (left.some((unit) => unit.currentHealth > 0) && right.some((unit) => unit.currentHealth > 0) && safety++ < 150) {
      const attackerSide = turn % 2 === 0 ? "left" : "right";
      const defendersSide = attackerSide === "left" ? "right" : "left";
      const attackers = attackerSide === "left" ? left : right;
      const defenders = attackerSide === "left" ? right : left;
      const attackerIndex = attackers.findIndex((unit) => unit.currentHealth > 0);
      const defenderIndex = defenders.findIndex((unit) => unit.currentHealth > 0);
      const attacker = attackers[attackerIndex];
      const defender = defenders[defenderIndex];
      const dodge = Math.random() < defender.effects.dodgeChance;
      let critical = false;
      let damage = 0;
      let heal = 0;
      let retaliation = 0;
      let abilityName = "";

      if (!dodge) {
        damage = attacker.currentPower;
        if (attacker.attacks === 0) damage += attacker.effects.firstStrikeBonus || 0;
        critical = Math.random() < attacker.effects.critChance;
        if (critical) damage = Math.round(damage * 1.55 + (attacker.effects.critDamage || 0));
        if (defender.currentHealth / defender.maxHealth <= (attacker.effects.executeThreshold || 0)) damage += attacker.effects.executeBonus || 0;
        damage = Math.max(1, Math.round(damage - defender.effects.damageReduction));
        defender.currentHealth = Math.max(0, defender.currentHealth - damage);
        heal = Math.round(damage * attacker.effects.lifesteal);
        attacker.currentHealth = Math.min(attacker.maxHealth, attacker.currentHealth + heal);
        retaliation = defender.effects.thorns || 0;
        attacker.currentHealth = Math.max(0, attacker.currentHealth - retaliation);
      }
      attacker.attacks += 1;
      const defeated = defender.currentHealth <= 0;
      if (defeated) {
        attacker.currentPower += attacker.effects.onKillPower || 0;
        const killHeal = attacker.effects.onKillHeal || 0;
        attacker.currentHealth = Math.min(attacker.maxHealth, attacker.currentHealth + killHeal);
        heal += killHeal;
      }
      if (attacker.isLeader && attacker.attacks === 1) abilityName = attackerSide === "left" ? leftPlayer.leader.ultimate.name : rightPlayer.leader.ultimate.name;
      events.push({
        attackerSide, attackerIndex, defenderSide: defendersSide, defenderIndex,
        attackerName: attacker.name, defenderName: defender.name, damage, dodge, critical, heal,
        retaliation, defeated, attackerDefeated: attacker.currentHealth <= 0,
        attackerHealth: attacker.currentHealth, attackerMax: attacker.maxHealth,
        defenderHealth: defender.currentHealth, defenderMax: defender.maxHealth,
        attackerPower: attacker.currentPower, abilityName,
        leftAlive: left.filter((unit) => unit.currentHealth > 0).length,
        rightAlive: right.filter((unit) => unit.currentHealth > 0).length
      });
      turn += 1;
    }
    const leftAlive = left.filter((unit) => unit.currentHealth > 0).length;
    const rightAlive = right.filter((unit) => unit.currentHealth > 0).length;
    const winnerSide = leftAlive > 0 ? "left" : "right";
    return { left, right, initialLeft, initialRight, events, leftAlive, rightAlive, winnerSide };
  }

  function createPairings() {
    const alive = state.players.filter((player) => !player.eliminated);
    const human = alive.find((player) => player.human);
    let pool = shuffle(alive.filter((player) => !player.human));
    const pairs = [];
    if (human) {
      const opponent = pool.shift();
      if (opponent) pairs.push([human, opponent]);
    }
    while (pool.length >= 2) pairs.push([pool.shift(), pool.shift()]);
    if (pool.length === 1) {
      const solo = pool.shift();
      const source = shuffle(alive.filter((player) => player.id !== solo.id))[0];
      pairs.push([solo, { ...source, id: `echo-${source.id}`, name: `${source.name} Echo`, team: source.team, ghost: true }]);
    }
    return pairs;
  }

  function fighterMarkup(fighter, side, index) {
    return `<figure class="lp-fighter lp-fighter--${fighter.relation}${fighter.isLeader ? " lp-fighter--leader" : ""}" data-fighter-side="${side}" data-fighter-index="${index}" data-inspect-combat="${side}:${index}" tabindex="0">
      <span class="lp-fighter__badge">${fighter.isLeader ? "♛ Crowned" : relationLabel(fighter.relation)}</span><img src="${fighter.image}" alt="${escapeHtml(fighter.name)}">
      <span class="lp-fighter__health"><i data-health-bar style="width:100%"></i><b>♥ <span data-health>${fighter.maxHealth}</span> / ${fighter.maxHealth}</b></span>
      <figcaption><strong>${escapeHtml(fighter.name)}</strong><span>⚔ <b data-power>${fighter.power}</b> // ${fighter.traits.map(escapeHtml).join(" · ")}</span></figcaption>
    </figure>`;
  }

  function renderCombat(result) {
    dom.build.hidden = true;
    dom.combat.hidden = false;
    dom.combatKicker.textContent = `Leader Clash // Round ${String(state.round).padStart(2, "0")}`;
    dom.combatTitle.textContent = `${heroDefinition(result.leftPlayer.leader.heroId).name} vs ${heroDefinition(result.rightPlayer.leader.heroId).name}`;
    dom.enemyName.textContent = result.rightPlayer.name;
    dom.combatEvent.textContent = "00";
    dom.playerCombat.innerHTML = result.fight.initialLeft.map((fighter, index) => fighterMarkup(fighter, "left", index)).join("");
    dom.enemyCombat.innerHTML = result.fight.initialRight.map((fighter, index) => fighterMarkup(fighter, "right", index)).join("");
    dom.playerUnits.textContent = result.fight.initialLeft.length;
    dom.enemyUnits.textContent = result.fight.initialRight.length;
    dom.combatFeed.textContent = "Command auras synchronized. Leaders taking the field.";
    dom.combatLog.innerHTML = `<article><b>AURA</b> ${escapeHtml(result.leftPlayer.leader.auraName)} online</article><article><b>AURA</b> ${escapeHtml(result.rightPlayer.leader.auraName)} online</article>`;
  }

  function fighterElement(side, index) {
    return $(`[data-fighter-side="${side}"][data-fighter-index="${index}"]`);
  }

  function updateFighter(side, index, health, max, power, defeated) {
    const card = fighterElement(side, index);
    if (!card) return;
    $("[data-health]", card).textContent = Math.max(0, health);
    $("[data-health-bar]", card).style.width = `${clamp((health / max) * 100, 0, 100)}%`;
    if (power !== undefined) $("[data-power]", card).textContent = power;
    card.classList.toggle("lp-fighter--defeated", defeated);
  }

  function floatText(card, textValue, className = "") {
    if (!card) return;
    const node = document.createElement("span");
    node.className = `lp-float ${className}`;
    node.textContent = textValue;
    node.style.left = "50%";
    node.style.top = "45%";
    card.append(node);
    window.setTimeout(() => node.remove(), 900);
  }

  function launchProjectile(attackerCard, defenderCard, critical) {
    if (!attackerCard || !defenderCard) return;
    const arena = $(".lp-combat-arena");
    const arenaRect = arena.getBoundingClientRect();
    const from = attackerCard.getBoundingClientRect();
    const to = defenderCard.getBoundingClientRect();
    const projectile = document.createElement("i");
    projectile.className = `lp-projectile${critical ? " lp-projectile--critical" : ""}`;
    const fromX = from.left + from.width / 2 - arenaRect.left;
    const fromY = from.top + from.height / 2 - arenaRect.top;
    const deltaX = to.left + to.width / 2 - arenaRect.left - fromX;
    const deltaY = to.top + to.height / 2 - arenaRect.top - fromY;
    projectile.style.left = `${fromX}px`;
    projectile.style.top = `${fromY}px`;
    projectile.style.setProperty("--x", `${deltaX}px`);
    projectile.style.setProperty("--y", `${deltaY}px`);
    projectile.style.setProperty("--angle", `${Math.atan2(deltaY, deltaX) * 180 / Math.PI}deg`);
    dom.combatFx.append(projectile);
    window.setTimeout(() => projectile.remove(), 600);
  }

  async function playCombat(result) {
    renderCombat(result);
    await wait(900);
    for (let index = 0; index < result.fight.events.length; index += 1) {
      const event = result.fight.events[index];
      const attacker = fighterElement(event.attackerSide, event.attackerIndex);
      const defender = fighterElement(event.defenderSide, event.defenderIndex);
      dom.combatEvent.textContent = String(index + 1).padStart(2, "0");
      attacker?.classList.add("lp-fighter--attacking");
      if (event.abilityName) {
        attacker?.classList.add("lp-fighter--ability");
        dom.combatFeed.textContent = `${event.attackerName} unleashes ${event.abilityName}!`;
        dom.combatLog.insertAdjacentHTML("afterbegin", `<article><b>ULT</b> ${escapeHtml(event.abilityName)}</article>`);
      } else if (event.dodge) {
        dom.combatFeed.textContent = `${event.defenderName} evades ${event.attackerName}'s attack.`;
      } else {
        dom.combatFeed.textContent = `${event.attackerName} hits ${event.defenderName} for ${event.damage}${event.critical ? " critical" : ""} damage.`;
      }
      launchProjectile(attacker, defender, event.critical);
      await wait(230);
      attacker?.classList.remove("lp-fighter--attacking");
      defender?.classList.add(event.dodge ? "lp-fighter--dodged" : "lp-fighter--hit");
      floatText(defender, event.dodge ? "EVADE" : `-${event.damage}`, event.critical ? "lp-float--critical" : "");
      if (event.heal) floatText(attacker, `+${event.heal}`, "lp-float--heal");
      if (event.retaliation) floatText(attacker, `-${event.retaliation}`, "lp-float--retaliation");
      updateFighter(event.defenderSide, event.defenderIndex, event.defenderHealth, event.defenderMax, undefined, event.defeated);
      updateFighter(event.attackerSide, event.attackerIndex, event.attackerHealth, event.attackerMax, event.attackerPower, event.attackerDefeated);
      await wait(COMBAT_BEAT - 230);
      defender?.classList.remove("lp-fighter--dodged", "lp-fighter--hit");
      attacker?.classList.remove("lp-fighter--ability");
      dom.playerUnits.textContent = event.leftAlive;
      dom.enemyUnits.textContent = event.rightAlive;
    }
    await wait(700);
  }

  function resolveResults(results) {
    results.forEach((result) => {
      const winner = result.fight.winnerSide === "left" ? result.leftPlayer : result.rightPlayer;
      const loser = result.fight.winnerSide === "left" ? result.rightPlayer : result.leftPlayer;
      const survivors = result.fight.winnerSide === "left" ? result.fight.leftAlive : result.fight.rightAlive;
      result.winner = winner;
      result.loser = loser;
      result.damage = Math.min(30, data.rules.lossDamageBase + survivors * 2 + Math.floor(state.round / 2));
      if (!loser.ghost) {
        loser.hp = Math.max(0, loser.hp - result.damage);
        if (loser.hp <= 0) {
          loser.eliminated = true;
          loser.ready = false;
          loser.status = "Eliminated";
        }
      }
      if (!winner.ghost) winner.status = "Round won";
    });
  }

  async function beginCombat() {
    if (state.phase !== "build") return;
    state.phase = "combat";
    window.clearInterval(buildTimer);
    clearAiTimers();
    state.players.filter((player) => !player.eliminated).forEach((player) => { player.status = "In combat"; });
    renderPlayers();
    const results = createPairings().map(([leftPlayer, rightPlayer]) => ({
      leftPlayer, rightPlayer, fight: simulateFight(leftPlayer, rightPlayer)
    }));
    const humanResult = results.find((result) => result.leftPlayer.human || result.rightPlayer.human);
    state.currentCombat = humanResult;
    document.body.dataset.audioScene = "combat";
    if (humanResult) await playCombat(humanResult);
    resolveResults(results);
    showRoundResult(humanResult);
  }

  function showRoundResult(result) {
    const human = state.players[0];
    const alive = state.players.filter((player) => !player.eliminated);
    const wonRound = result?.winner?.human;
    state.gameOver = human.eliminated || (alive.length === 1 && alive[0].human);
    dom.result.classList.toggle("lp-result--defeat", human.eliminated || !wonRound);
    dom.resultKicker.textContent = state.gameOver ? "Campaign Complete" : `Round ${String(state.round).padStart(2, "0")} Complete`;
    if (human.eliminated) {
      dom.resultTitle.textContent = "Command Signal Lost";
      dom.resultDetail.textContent = `${result.winner.name} broke your formation for ${result.damage} integrity. Your Leader Protocol run is over.`;
    } else if (alive.length === 1) {
      dom.resultTitle.textContent = "Protocol Dominated";
      dom.resultDetail.textContent = `${heroDefinition(state.selectedLeader.heroId).name} stands as the final leader. Every rival command signal has fallen.`;
    } else if (wonRound) {
      dom.resultTitle.textContent = "Formation Victorious";
      dom.resultDetail.textContent = `${result.loser.name} lost ${result.damage} integrity. Your Command Link held the line.`;
    } else {
      dom.resultTitle.textContent = "Formation Breached";
      dom.resultDetail.textContent = `${result.winner.name} dealt ${result.damage} integrity damage. Rebuild around your leader's doctrine.`;
    }
    dom.resultHealth.textContent = human.hp;
    dom.resultRemaining.textContent = alive.length;
    dom.continueButton.hidden = state.gameOver;
    dom.returnButton.hidden = !state.gameOver;
    dom.result.hidden = false;
    renderPlayers();
  }

  function continueCampaign() {
    if (state.gameOver) return;
    state.round += 1;
    state.credits += data.rules.roundIncome;
    state.selectedSlot = null;
    startBuildPhase(false);
    if ((state.round - 1) % data.rules.leaderAscendsEvery === 0) announce(`${heroDefinition(state.selectedLeader.heroId).name} ascended to level ${ascensionLevel()}!`);
  }

  function inspectUnit(unit, team, leader, anchor) {
    if (!unit || !leader) return;
    const stats = effectiveUnit(unit, team, leader);
    const relation = relationship(unit, leader);
    const relationText = relation === "leader" ? `${leader.ultimate.name}: ${leader.ultimate.description}` : relation === "inspired" ? `Receives ${leader.auraName}.` : relation === "conflict" ? `Penalized by ${leader.auraName}.` : "No direct leader interaction.";
    dom.inspector.innerHTML = `<header><img src="${unit.image}" alt=""><span><small>${relationLabel(relation)} // ${unit.traits.map(escapeHtml).join(" • ")}</small><h2>${escapeHtml(unit.name)}</h2><span>${unit.isLeader ? `Ascension ${ascensionLevel()} hyper leader` : "Formation unit"}</span></span></header><div class="lp-inspector__stats"><span><small>Power</small><b>${stats.power}</b></span><span><small>Health</small><b>${stats.maxHealth}</b></span><span><small>Cost</small><b>◆ ${unit.cost}</b></span></div><section><small>Native Ability</small><strong>${escapeHtml(unit.ability.name)}</strong><p>${escapeHtml(unit.ability.description)}</p></section><footer>${escapeHtml(relationText)}</footer>`;
    dom.inspector.hidden = false;
    dom.inspector.classList.add("lp-inspector--visible");
    const rect = anchor.getBoundingClientRect();
    const width = 310;
    dom.inspector.style.left = `${clamp(rect.left + rect.width / 2 - width / 2, 12, window.innerWidth - width - 12)}px`;
    dom.inspector.style.top = `${rect.top > 330 ? rect.top - 12 : rect.bottom + 12}px`;
    dom.inspector.classList.toggle("lp-inspector--above", rect.top > 330);
  }

  function hideInspector() {
    dom.inspector.hidden = true;
    dom.inspector.classList.remove("lp-inspector--visible", "lp-inspector--above");
  }

  function openRules(open) {
    dom.rules.hidden = !open;
    dom.rulesButton.setAttribute("aria-expanded", String(open));
  }

  function bindEvents() {
    dom.leaderOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-select-leader]");
      if (button) selectLeader(Number(button.dataset.selectLeader));
    });
    dom.shop.addEventListener("click", (event) => {
      const button = event.target.closest("[data-buy-offer]");
      if (button) buyOffer(Number(button.dataset.buyOffer));
    });
    dom.board.addEventListener("click", (event) => {
      const sell = event.target.closest("[data-sell-slot]");
      if (sell) {
        event.stopPropagation();
        sellUnit(Number(sell.dataset.sellSlot));
        return;
      }
      const slot = event.target.closest("[data-board-slot]");
      if (slot) selectBoardSlot(Number(slot.dataset.boardSlot));
    });
    dom.reroll.addEventListener("click", () => rollShop(false));
    dom.ready.addEventListener("click", lockPlayerAndFight);
    dom.continueButton.addEventListener("click", continueCampaign);
    dom.rulesButton.addEventListener("click", () => openRules(true));
    $$('[data-close-rules]').forEach((button) => button.addEventListener("click", () => openRules(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        openRules(false);
        hideInspector();
      }
    });
    document.addEventListener("pointerover", (event) => {
      const teamCard = event.target.closest("[data-inspect-team]");
      const shopCard = event.target.closest("[data-inspect-shop]");
      const combatCard = event.target.closest("[data-inspect-combat]");
      if (teamCard) inspectUnit(state.team[Number(teamCard.dataset.inspectTeam)], state.team, state.selectedLeader, teamCard);
      else if (shopCard) {
        const offer = state.shop[Number(shopCard.dataset.inspectShop)];
        if (offer) inspectUnit(makeUnit(offer.hero), state.team, state.selectedLeader, shopCard);
      } else if (combatCard && state.currentCombat) {
        const [side, rawIndex] = combatCard.dataset.inspectCombat.split(":");
        const player = side === "left" ? state.currentCombat.leftPlayer : state.currentCombat.rightPlayer;
        const units = player.team.filter(Boolean);
        inspectUnit(units[Number(rawIndex)], player.team, player.leader, combatCard);
      }
    });
    document.addEventListener("pointerout", (event) => {
      if (event.target.closest("[data-inspect-team], [data-inspect-shop], [data-inspect-combat]") && !event.relatedTarget?.closest?.("[data-inspect-team], [data-inspect-shop], [data-inspect-combat]")) hideInspector();
    });
  }

  async function init() {
    try {
      const response = await fetch(DATA_SOURCE);
      if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
      data = await response.json();
      state.credits = data.rules.startingCredits;
      state.seconds = data.rules.buildSeconds;
      state.team = Array(data.rules.teamSlots).fill(null);
      createLobby();
      bindEvents();
      renderLeaderDraft();
      renderHud();
      renderPlayers();
      renderBoard();
      state.phase = "leader-draft";
    } catch (error) {
      console.error(error);
      dom.leaderOptions.innerHTML = `<p class="lp-load-error">Leader data could not be loaded. Run the game from a local server or deployed site, then refresh.</p>`;
    }
  }

  init();
})();
