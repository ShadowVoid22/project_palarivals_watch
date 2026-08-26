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

function showHero(hero) {
  const heroAbility = abilities[hero.id];
  const traitIds = heroTraits[hero.id] || [];
  const world = getUniversePresentation(hero.universe);
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
    <div class="detail-content">
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
    </div>`;

  dialog.showModal();
}

[searchInput, universeFilter, traitFilter].forEach((control) => control.addEventListener("input", renderHeroes));
closeDialog.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

if (heroes.length === 0) {
  heroCount.textContent = "Archive unavailable";
  emptyState.hidden = false;
  emptyState.querySelector("h2").textContent = "Archive unavailable";
  emptyState.querySelector("p").textContent = "No hero data is available.";
} else {
  populateFilters();
  renderHeroes();
}
