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

let heroes = heroData.heroes || [];
const abilities = abilityData.abilities || {};
const traits = traitData.traits || {};
const heroTraits = traitData.heroes || {};

function formatName(value) {
  return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    const matchesSearch = !search ||
      hero.name.toLowerCase().includes(search) ||
      String(hero.signature || "").toLowerCase().includes(search);
    const matchesUniverse = universe === "all" || hero.universe === universe;
    const matchesTrait = trait === "all" || (heroTraits[hero.id] || []).includes(trait);
    return matchesSearch && matchesUniverse && matchesTrait;
  });
}

function renderHeroes() {
  const visibleHeroes = getFilteredHeroes();
  heroGrid.replaceChildren(...visibleHeroes.map(createCard));
  heroCount.textContent = `${visibleHeroes.length} of ${heroes.length} heroes`;
  emptyState.hidden = visibleHeroes.length > 0;
}

function createCard(hero) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "hero-card";
  card.innerHTML = `
    <img src="${hero.image}" alt="${hero.name}" loading="lazy">
    <div class="hero-card__body">
      <h2>${hero.name}</h2>
      <p>${formatName(hero.universe)} · ${hero.signature || "Hero"}</p>
    </div>`;
  card.addEventListener("click", () => showHero(hero));
  return card;
}

function showHero(hero) {
  const heroAbility = abilities[hero.id];
  const heroTraitList = (heroTraits[hero.id] || []).map((id) => traits[id]).filter(Boolean);

  heroDetails.innerHTML = `
    <div class="detail-hero">
      <img src="${hero.image}" alt="${hero.name}">
      <div>
        <p>${formatName(hero.universe)}</p>
        <h2>${hero.name}</h2>
        <p>Signature: ${hero.signature || "Unknown"}</p>
      </div>
    </div>
    <section class="detail-section">
      <h3>Ability</h3>
      ${heroAbility ? `<p><strong>${heroAbility.name}</strong> (${heroAbility.type})</p><p>${heroAbility.description}</p>` : "<p>No ability data yet.</p>"}
    </section>
    <section class="detail-section">
      <h3>Traits</h3>
      ${heroTraitList.length ? `<ul>${heroTraitList.map((trait) => `<li><strong>${trait.name}</strong> — ${trait.description}</li>`).join("")}</ul>` : "<p>No traits listed yet.</p>"}
    </section>`;

  dialog.showModal();
}

[searchInput, universeFilter, traitFilter].forEach((control) => control.addEventListener("input", renderHeroes));
closeDialog.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

if (heroes.length === 0) {
  heroCount.textContent = "No heroes found";
  emptyState.hidden = false;
  emptyState.textContent = "No hero data is available.";
} else {
  populateFilters();
  renderHeroes();
}
