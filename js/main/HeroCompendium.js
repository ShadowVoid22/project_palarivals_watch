const heroData = window.__PALARIVALS_HERO_CHESS || {};
const abilityData = window.__PALARIVALS_HERO_ABILITIES || {};
const traitData = window.__PALARIVALS_HERO_TRAITS || {};

const heroGrid = document.querySelector("#heroGrid");
const heroCount = document.querySelector("#heroCount");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#heroSearch");
const universeFilter = document.querySelector("#universeFilter");
const traitFilter = document.querySelector("#traitFilter");
const dialog = document.querySelector("#heroDialog");
const heroDetails = document.querySelector("#heroDetails");
const closeDialog = document.querySelector("#closeDialog");

const heroes = heroData.heroes || [];
const abilities = abilityData.abilities || {};
const traits = traitData.traits || {};
const heroTraits = traitData.heroes || {};
let heroLore = {};
let arcadeArchives = {
  abilityDraft: {},
  leaderProtocol: {},
  chessAbilities: {}
};

const universePresentation = {
  rivals: {
    designation: "Multiversal Vanguard",
    code: "MR-616"
  },
  overwatch: {
    designation: "Strike Force Operative",
    code: "OW-07"
  },
  paladins: {
    designation: "Realm Champion",
    code: "PR-08"
  }
};

function formatName(value) {
  return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getUniversePresentation(universe) {
  return universePresentation[universe] || {
    designation: "Cross-Universe Operative",
    code: "PRW-00"
  };
}

async function loadJsonArchive(source, label) {
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${label} request failed with status ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`${label} could not be loaded.`, error);
    return {};
  }
}

async function loadCompendiumArchives() {
  const [loreData, abilityDraft, leaderProtocol, chessAbilities] = await Promise.all([
    loadJsonArchive("data/hero-lore.json", "Hero lore"),
    loadJsonArchive("data/ability-draft.json", "Ability Draft archive"),
    loadJsonArchive("data/leader-protocol.json", "Leader Protocol archive"),
    loadJsonArchive("data/hero-chess-abilities.json", "Hero Chess archive")
  ]);

  heroLore = loreData.heroes || {};
  arcadeArchives = { abilityDraft, leaderProtocol, chessAbilities };
}

function populateFilters() {
  const universes = [...new Set(heroes.map((hero) => hero.universe).filter(Boolean))].sort();
  universes.forEach((universe) => universeFilter.append(new Option(formatName(universe), universe)));

  Object.entries(traits).forEach(([id, trait]) => {
    traitFilter.append(new Option(trait.name || formatName(id), id));
  });
}

function getFilteredHeroes() {
  const search = searchInput.value.trim().toLowerCase();
  const universe = universeFilter.value;
  const trait = traitFilter.value;

  return heroes.filter((hero) => {
    const matchesSearch = !search
      || hero.name.toLowerCase().includes(search)
      || String(hero.signature || "").toLowerCase().includes(search);
    const matchesUniverse = universe === "all" || hero.universe === universe;
    const matchesTrait = trait === "all" || (heroTraits[hero.id] || []).includes(trait);
    return matchesSearch && matchesUniverse && matchesTrait;
  });
}

function renderHeroes() {
  const visibleHeroes = getFilteredHeroes();
  heroGrid.replaceChildren(...visibleHeroes.map(createCard));
  heroCount.textContent = `${visibleHeroes.length} / ${heroes.length} files available`;
  emptyState.hidden = visibleHeroes.length > 0;
}

let lastFilterSoundAt = 0;

function updateFilters() {
  renderHeroes();
  const now = performance.now();

  if (now - lastFilterSoundAt > 90) {
    window.PRWAudio?.play("filter");
    lastFilterSoundAt = now;
  }
}

function createCard(hero, index) {
  const traitIds = heroTraits[hero.id] || [];
  const world = getUniversePresentation(hero.universe);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "hero-card";
  card.dataset.universe = hero.universe || "unknown";
  card.setAttribute("aria-label", `Open ${hero.name} hero file`);
  card.innerHTML = `
    <div class="hero-card__portrait">
      <img src="${hero.image}" alt="${hero.name}" loading="lazy">
      ${hero.logo ? `<img class="hero-card__logo" src="${hero.logo}" alt="">` : ""}
      <span class="hero-card__index">FILE ${String(index + 1).padStart(2, "0")}</span>
      <span class="hero-card__world-design" aria-hidden="true"><i></i><b>${world.code}</b></span>
    </div>
    <div class="hero-card__body">
      <span class="hero-card__universe">${formatName(hero.universe)} // ${world.designation}</span>
      <h3>${hero.name}</h3>
      <p class="hero-card__signature">Signature // ${hero.signature || "Classified"}</p>
      <div class="hero-card__traits">
        ${traitIds.map((id) => `<span class="trait-chip">${traits[id]?.name || formatName(id)}</span>`).join("")}
      </div>
      <span class="hero-card__inspect" aria-hidden="true">&#8594;</span>
    </div>`;
  card.addEventListener("click", () => showHero(hero));
  return card;
}

function createTraitFile(id) {
  const trait = traits[id];
  if (!trait) return "";

  return `
    <div class="trait-file">
      <span class="trait-file__icon" aria-hidden="true">${trait.name.slice(0, 1)}</span>
      <strong>${trait.name}</strong>
      <small>${formatName(trait.category)} // ${trait.ability}</small>
      <p>${trait.description}</p>
    </div>`;
}

function getHeroById(collection, heroId) {
  return (collection || []).find((entry) => entry.id === heroId);
}

function formatEffectName(value) {
  const effectNames = {
    periodicHealEvery: "Healing Pulse Frequency",
    periodicHeal: "Healing per Pulse",
    reviveHealth: "One-Time Revival Health",
    onHitPower: "Power Gained per Hit",
    allyBonusPower: "Power Granted to Other Allies",
    allyBonusHealth: "Health Granted to Other Allies",
    armorPierce: "Enemy Defense Ignored",
    enrageThreshold: "Rage Health Threshold",
    enragePower: "Power Gained on Rage",
    enrageHeal: "Health Restored on Rage",
    missingHealthDamage: "Maximum Missing-Health Damage",
    bonusAttackEvery: "Turret Volley Frequency",
    bonusAttackDamage: "Turret Volley Damage",
    attackRamp: "Stacking Curse Damage",
  };
  if (effectNames[value]) return effectNames[value];
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEffectValue(key, value) {
  if (typeof value !== "number") return value;
  if (/Every$/i.test(key)) return `Every ${value}`;
  if (/chance|lifesteal|threshold/i.test(key)) return `${Math.round(value * 100)}%`;
  if (/multiplier/i.test(key)) return `${value}x`;
  return value > 0 ? `+${value}` : String(value);
}

function createEffectChips(effects) {
  const entries = Object.entries(effects || {});
  if (!entries.length) return "";

  return `<div class="mode-effects">${entries.map(([key, value]) => `
    <span><b>${formatEffectValue(key, value)}</b>${formatEffectName(key)}</span>`).join("")}</div>`;
}

function createModeStats(hero) {
  if (!hero) return "";
  return `
    <div class="mode-stats" aria-label="Mode statistics">
      <div><span>Power</span><strong>${hero.power ?? "--"}</strong></div>
      <div><span>Health</span><strong>${hero.health ?? "--"}</strong></div>
      <div><span>Recruit Cost</span><strong>${hero.cost ?? "--"}<small> CR</small></strong></div>
    </div>`;
}

function createModeHeader({ index, eyebrow, title, description, href, linkLabel }) {
  return `
    <header class="mode-panel__header">
      <div>
        <p class="detail-section__label">Arcade File ${index} // ${eyebrow}</p>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
      <a class="mode-launch" href="${href}"><span>${linkLabel}</span><b aria-hidden="true">&#8594;</b></a>
    </header>`;
}

function createAbilityDraftPanel(hero) {
  const data = arcadeArchives.abilityDraft || {};
  const draftHero = getHeroById(data.heroes, hero.id);
  const draftAbility = (data.abilities || []).find((ability) => ability.origin === hero.name);

  return `
    <section class="mode-panel mode-panel--draft" id="heroModeDraft" role="tabpanel" aria-labelledby="heroTabDraft" hidden>
      ${createModeHeader({
        index: "01",
        eyebrow: "Ability Fusion",
        title: "Ability Draft",
        description: "Recruit the hero, draft extra powers, and merge matching units to combine their equipped abilities.",
        href: "AbilityDraft.html",
        linkLabel: "Open Ability Draft"
      })}
      ${draftHero ? createModeStats(draftHero) : ""}
      <div class="mode-card-grid">
        <article class="mode-card mode-card--featured">
          <span class="mode-card__index">Native Ability</span>
          ${draftAbility ? `
            <div class="mode-card__title-row">
              <h4>${draftAbility.name}</h4>
              <span class="mode-rarity mode-rarity--${draftAbility.rarity || "standard"}">${draftAbility.rarity || "Standard"}</span>
            </div>
            <small>${draftAbility.type || "Combat"} // Origin: ${draftAbility.origin}</small>
            <p>${draftAbility.description}</p>
            ${createEffectChips(draftAbility.effects)}` : `
            <h4>Archive Unavailable</h4>
            <p>This hero's Ability Draft record could not be loaded.</p>`}
        </article>
        <article class="mode-card mode-card--briefing">
          <span class="mode-card__index">Fusion Briefing</span>
          <h4>Build a Custom Operative</h4>
          <p>This ability begins attached to ${hero.name}. In this mode, drafted abilities can be added to units, and merging copies preserves powers from both units to form a combined loadout.</p>
          <div class="mode-rule"><b>Merge Result</b><span>Level up + retain unique abilities</span></div>
        </article>
      </div>
    </section>`;
}

function createLeaderProtocolPanel(hero) {
  const data = arcadeArchives.leaderProtocol || {};
  const protocolHero = getHeroById(data.heroes, hero.id);
  const leader = (data.leaders || []).find((entry) => entry.heroId === hero.id);
  const heroAbility = protocolHero?.ability;

  return `
    <section class="mode-panel mode-panel--leader" id="heroModeLeader" role="tabpanel" aria-labelledby="heroTabLeader" hidden>
      ${createModeHeader({
        index: "02",
        eyebrow: leader ? "Leader Candidate" : "Field Recruit",
        title: "Leader Protocol",
        description: leader
          ? `${hero.name} can command a squad as ${leader.title}, empowering favored formations while weakening opposed ones.`
          : `${hero.name} serves as a recruit in this mode and can be shaped by compatible leader auras and Command Link bonuses.`,
        href: "LeaderProtocol.html",
        linkLabel: "Open Leader Protocol"
      })}
      ${protocolHero ? createModeStats(protocolHero) : ""}
      ${leader ? `
        <div class="leader-command-card">
          <div class="leader-command-card__identity">
            <span>Command Designation</span>
            <h4>${leader.title}</h4>
            <strong>${leader.auraName}</strong>
            <p>${leader.auraText}</p>
          </div>
          <div class="leader-alignments">
            <div><span>Favored Protocols</span>${leader.favored.map((trait) => `<b class="alignment-chip alignment-chip--favored">+ ${formatName(trait)}</b>`).join("")}</div>
            <div><span>Opposed Protocols</span>${leader.opposed.map((trait) => `<b class="alignment-chip alignment-chip--opposed">- ${formatName(trait)}</b>`).join("")}</div>
          </div>
        </div>
        <div class="mode-card-grid">
          <article class="mode-card">
            <span class="mode-card__index">Leader Amplification</span>
            <h4>Hyper-Buffed Form</h4>
            <p>When selected as the leader, ${hero.name}'s base body is dramatically enhanced before combat.</p>
            ${createEffectChips(leader.leaderEffects)}
          </article>
          <article class="mode-card mode-card--featured">
            <span class="mode-card__index">Leader Ultimate</span>
            <h4>${leader.ultimate.name}</h4>
            <p>${leader.ultimate.description}</p>
            ${createEffectChips(leader.ultimate.effects)}
          </article>
        </div>` : `
        <div class="mode-card-grid">
          <article class="mode-card mode-card--featured">
            <span class="mode-card__index">Recruit Ability</span>
            <h4>${heroAbility?.name || "Archive Unavailable"}</h4>
            <p>${heroAbility?.description || "This recruit's ability record could not be loaded."}</p>
            ${createEffectChips(heroAbility?.effects)}
          </article>
          <article class="mode-card mode-card--briefing">
            <span class="mode-card__index">Command Status</span>
            <h4>Recruit-Only Operative</h4>
            <p>${hero.name} is not currently one of the selectable leaders, but their three traits determine which leader buffs and nerfs affect them.</p>
            <div class="mode-trait-row">${(protocolHero?.traits || []).map((trait) => `<span>${formatName(trait)}</span>`).join("")}</div>
          </article>
        </div>`}
    </section>`;
}

function createHeroChessPanel(hero) {
  const abilities = arcadeArchives.chessAbilities || {};
  const pieceOrder = ["pawn", "rook", "knight", "bishop", "queen", "king"];
  const pieceMarks = { pawn: "P", rook: "R", knight: "N", bishop: "B", queen: "Q", king: "K" };
  const pieceFiles = pieceOrder.map((piece) => ({ piece, ability: abilities[`${hero.id}-${piece}`] }));

  return `
    <section class="mode-panel mode-panel--chess" id="heroModeChess" role="tabpanel" aria-labelledby="heroTabChess" hidden>
      ${createModeHeader({
        index: "03",
        eyebrow: "Piece Assignment Matrix",
        title: "Hero Chess",
        description: `Draft ${hero.name} into one chess role to transform every matching piece with a unique movement or combat effect.`,
        href: "HeroChess.html",
        linkLabel: "Open Hero Chess"
      })}
      <div class="chess-power-grid">
        ${pieceFiles.map(({ piece, ability }) => `
          <article class="chess-power-card">
            <div class="chess-power-card__piece" aria-hidden="true">${pieceMarks[piece]}</div>
            <div>
              <span>${formatName(piece)} Assignment</span>
              <h4>${ability?.label || "Archive Unavailable"}</h4>
              <p>${ability?.description || `No ${piece} power has been filed for this hero.`}</p>
            </div>
          </article>`).join("")}
      </div>
    </section>`;
}

function activateHeroTab(tabId, moveFocus = false) {
  const tabs = [...heroDetails.querySelectorAll("[role='tab']")];
  const panels = [...heroDetails.querySelectorAll("[role='tabpanel']")];
  const activeTab = tabs.find((tab) => tab.dataset.heroTab === tabId) || tabs[0];
  if (!activeTab) return;

  tabs.forEach((tab) => {
    const isActive = tab === activeTab;
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  panels.forEach((panel) => { panel.hidden = panel.id !== activeTab.getAttribute("aria-controls"); });
  if (moveFocus) activeTab.focus();
}

function showHero(hero) {
  const heroAbility = abilities[hero.id];
  const lore = heroLore[hero.id];
  const traitIds = heroTraits[hero.id] || [];
  const world = getUniversePresentation(hero.universe);
  const standardHero = getHeroById(arcadeArchives.leaderProtocol?.heroes, hero.id)
    || getHeroById(arcadeArchives.abilityDraft?.heroes, hero.id);
  dialog.dataset.universe = hero.universe || "unknown";

  heroDetails.innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero__portrait">
        <img src="${hero.image}" alt="${hero.name}">
        ${hero.logo ? `<img class="detail-hero__logo" src="${hero.logo}" alt="">` : ""}
        <span class="detail-hero__world-design" aria-hidden="true"><i></i><b>${world.code}</b></span>
      </div>
      <div class="detail-hero__copy">
        <p class="detail-hero__universe">${formatName(hero.universe)} // ${world.designation}</p>
        <h2 id="dialogHeroName">${hero.name}</h2>
        <p class="detail-hero__signature"><span>Combat Signature</span><br>${hero.signature || "Unknown"}</p>
      </div>
    </div>
    <nav class="detail-tabs" role="tablist" aria-label="${hero.name} game mode files">
      <button id="heroTabStandard" type="button" role="tab" aria-controls="heroModeStandard" aria-selected="true" data-hero-tab="standard"><span>00</span><b>Standard</b><small>Core File</small></button>
      <button id="heroTabDraft" type="button" role="tab" aria-controls="heroModeDraft" aria-selected="false" tabindex="-1" data-hero-tab="draft"><span>01</span><b>Ability Draft</b><small>Fusion File</small></button>
      <button id="heroTabLeader" type="button" role="tab" aria-controls="heroModeLeader" aria-selected="false" tabindex="-1" data-hero-tab="leader"><span>02</span><b>Leader Protocol</b><small>Command File</small></button>
      <button id="heroTabChess" type="button" role="tab" aria-controls="heroModeChess" aria-selected="false" tabindex="-1" data-hero-tab="chess"><span>03</span><b>Hero Chess</b><small>Strategy File</small></button>
    </nav>
    <div class="mode-panels">
      <section class="detail-content mode-panel mode-panel--standard" id="heroModeStandard" role="tabpanel" aria-labelledby="heroTabStandard">
        <section class="standard-vitals" aria-label="${hero.name} level one combat statistics">
          <div class="standard-vitals__heading">
            <p class="detail-section__label">Base Combat Values // Level 1</p>
            <span>Unmodified</span>
          </div>
          <div class="standard-vital standard-vital--power">
            <span aria-hidden="true">&#10022;</span>
            <div><small>Power</small><strong>${standardHero?.power ?? "--"}</strong></div>
          </div>
          <div class="standard-vital standard-vital--health">
            <span aria-hidden="true">&#9829;</span>
            <div><small>Health</small><strong>${standardHero?.health ?? "--"}</strong></div>
          </div>
        </section>
        <section class="detail-section">
          <p class="detail-section__label">Core Ability</p>
          ${heroAbility ? `
            <div class="ability-header">
              <h3>${heroAbility.name}</h3>
              <span class="ability-type">${heroAbility.type}</span>
            </div>
            <p class="ability-description">${heroAbility.description}</p>` : `
            <h3>Classified</h3>
            <p class="ability-description">No ability data is available for this hero yet.</p>`}
        </section>
        <section class="detail-section">
          <p class="detail-section__label">Trait Loadout // ${traitIds.length} Installed</p>
          <h3>Synergy Protocols</h3>
          ${traitIds.length
            ? `<div class="trait-list">${traitIds.map(createTraitFile).join("")}</div>`
            : `<p class="ability-description">No traits are listed for this hero yet.</p>`}
        </section>
        <section class="detail-section detail-section--lore">
          <div class="lore-file">
            <div class="lore-file__stamp">
              <small>Background Intel</small>
              <strong>Declassified</strong>
              <span>${world.code} // ${hero.id.toUpperCase()}</span>
            </div>
            <div class="lore-file__copy">
              <p class="detail-section__label">Origin Record // Archive Entry</p>
              <h3>${lore?.title || "Dossier Pending"}</h3>
              <p class="lore-file__text">${lore?.text || "No background intelligence has been filed for this hero yet."}</p>
              ${lore?.sourceUrl ? `
                <a class="lore-file__source" href="${lore.sourceUrl}" target="_blank" rel="noopener noreferrer">
                  <span>Official lore source</span>
                  <strong>${lore.sourceLabel || "View source"}</strong>
                  <b aria-hidden="true">&#8599;</b>
                </a>` : ""}
            </div>
          </div>
        </section>
      </section>
      ${createAbilityDraftPanel(hero)}
      ${createLeaderProtocolPanel(hero)}
      ${createHeroChessPanel(hero)}
    </div>`;

  activateHeroTab("standard");

  dialog.showModal();
  window.PRWAudio?.play("fileOpen");
}

function closeHeroDialog() {
  if (!dialog.open) return;
  dialog.close();
  window.PRWAudio?.play("fileClose");
}

[searchInput, universeFilter, traitFilter].forEach((control) => control.addEventListener("input", updateFilters));
closeDialog.addEventListener("click", closeHeroDialog);
heroDetails.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-hero-tab]");
  if (!tab) return;
  activateHeroTab(tab.dataset.heroTab);
  window.PRWAudio?.play("filter");
});
heroDetails.addEventListener("keydown", (event) => {
  const currentTab = event.target.closest("[role='tab']");
  if (!currentTab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

  event.preventDefault();
  const tabs = [...heroDetails.querySelectorAll("[role='tab']")];
  const currentIndex = tabs.indexOf(currentTab);
  let nextIndex = currentIndex;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  activateHeroTab(tabs[nextIndex].dataset.heroTab, true);
  window.PRWAudio?.play("filter");
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeHeroDialog();
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeHeroDialog();
});

if (heroes.length === 0) {
  heroCount.textContent = "Archive unavailable";
  emptyState.hidden = false;
  emptyState.querySelector("h2").textContent = "Archive unavailable";
  emptyState.querySelector("p").textContent = "No hero data is available.";
} else {
  populateFilters();
  loadCompendiumArchives().finally(renderHeroes);
}
