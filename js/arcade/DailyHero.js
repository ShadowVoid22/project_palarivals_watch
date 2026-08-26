const DAILY_CONFIG_SOURCE = "data/daily-hero.json";
const HERO_DATA_SOURCE = "data/leader-protocol.json";
const STATE_PREFIX = "palarivals-watch-daily-hero";
const HISTORY_KEY = "palarivals-watch-daily-hero-history";
const DAY_MS = 86_400_000;

const utcClock = document.querySelector("#utcClock");
const resetClock = document.querySelector("#resetClock");
const resultResetClock = document.querySelector("#resultResetClock");
const stripDate = document.querySelector("#stripDate");
const puzzleNumber = document.querySelector("#puzzleNumber");
const puzzleDate = document.querySelector("#puzzleDate");
const attemptLimit = document.querySelector("#attemptLimit");
const attemptsUsed = document.querySelector("#attemptsUsed");
const attemptsRemaining = document.querySelector("#attemptsRemaining");
const guessGrid = document.querySelector("#guessGrid");
const guessForm = document.querySelector("#guessForm");
const guessInput = document.querySelector("#guessInput");
const guessButton = document.querySelector("#guessButton");
const heroSuggestions = document.querySelector("#heroSuggestions");
const guessMessage = document.querySelector("#guessMessage");
const completedConsole = document.querySelector("#completedConsole");
const completedSummary = document.querySelector("#completedSummary");
const showResultsButton = document.querySelector("#showResultsButton");
const shareInlineButton = document.querySelector("#shareInlineButton");
const resultPanel = document.querySelector("#resultPanel");
const resultSignal = document.querySelector("#resultSignal");
const resultKicker = document.querySelector("#resultKicker");
const resultTitle = document.querySelector("#resultTitle");
const resultCopy = document.querySelector("#resultCopy");
const resultHeroImage = document.querySelector("#resultHeroImage");
const resultHeroName = document.querySelector("#resultHeroName");
const resultHeroDetails = document.querySelector("#resultHeroDetails");
const shareButton = document.querySelector("#shareButton");
const resultCloseButtons = [...document.querySelectorAll("[data-result-close]")];
const playedStat = document.querySelector("#playedStat");
const winsStat = document.querySelector("#winsStat");
const streakStat = document.querySelector("#streakStat");

let config;
let heroes = [];
let answer;
let state;
let currentDateKey;
let dailyNumber = 1;
let selectedHeroId = null;
let resultTrigger = null;

function utcKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function utcDateFromKey(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

function shiftUtcKey(key, amount) {
  return new Date(utcDateFromKey(key).getTime() + (amount * DAY_MS)).toISOString().slice(0, 10);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function hashRotationSeed(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function rawRotationForCycle(baseRotation, cycleIndex) {
  if (cycleIndex === 0) return [...baseRotation];
  const shuffled = [...baseRotation];
  const random = createSeededRandom(hashRotationSeed(`${config.rotationSeed || "PRW-DAILY-HERO"}:${cycleIndex}`));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function rotationForCycle(baseRotation, cycleIndex) {
  const rotation = rawRotationForCycle(baseRotation, cycleIndex);
  if (cycleIndex === 0 || rotation.length < 2) return rotation;

  const previousRotation = rawRotationForCycle(baseRotation, cycleIndex - 1);
  if (rotation.every((heroId, index) => heroId === previousRotation[index])) {
    rotation.push(rotation.shift());
  }

  const previousFinalHero = previousRotation.at(-1);
  if (rotation[0] === previousFinalHero) {
    const safeSwapIndex = rotation.findIndex((heroId, index) => index > 0 && heroId !== previousFinalHero);
    [rotation[0], rotation[safeSwapIndex]] = [rotation[safeSwapIndex], rotation[0]];
  }
  return rotation;
}

function formatDateLabel(key) {
  const date = utcDateFromKey(key);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(date).toUpperCase();
}

function universeLabel(hero) {
  return config.universeLabels?.[hero.universe] || hero.universe;
}

function playstyleFor(hero) {
  return (hero.traits || []).find((trait) => ["poke", "dive", "brawl"].includes(trait)) || "unknown";
}

function roleFor(hero) {
  return (hero.traits || []).find((trait) => ["tank", "dps", "support"].includes(trait)) || "unknown";
}

function titleCase(value) {
  if (String(value).toLowerCase() === "dps") return "DPS";
  return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function heroById(id) {
  return heroes.find((hero) => hero.id === id);
}

function createNewState() {
  return { date: currentDateKey, guesses: [], completed: false, won: false };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(`${STATE_PREFIX}:${currentDateKey}`));
    if (!saved || saved.date !== currentDateKey) return createNewState();

    const validGuesses = [...new Set((saved.guesses || []).filter((id) => heroById(id)))].slice(0, config.maxGuesses);
    const guessedAnswer = validGuesses.includes(answer.id);
    return {
      date: currentDateKey,
      guesses: validGuesses,
      completed: guessedAnswer || validGuesses.length >= config.maxGuesses,
      won: guessedAnswer
    };
  } catch {
    return createNewState();
  }
}

function saveState() {
  try {
    localStorage.setItem(`${STATE_PREFIX}:${currentDateKey}`, JSON.stringify(state));
  } catch {
    // The puzzle still works if browser storage is unavailable.
  }
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch {
    return {};
  }
}

function writeHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Statistics are optional when browser storage is unavailable.
  }
}

function recordResult() {
  const history = readHistory();
  if (!history[currentDateKey]) {
    history[currentDateKey] = { won: state.won, attempts: state.guesses.length };
    writeHistory(history);
  }
  renderStats();
}

function renderStats() {
  const history = readHistory();
  const entries = Object.values(history);
  const wins = entries.filter((entry) => entry.won).length;
  let streak = 0;
  let cursor = currentDateKey;

  if (history[cursor] && !history[cursor].won) {
    streak = 0;
  } else {
    if (!history[cursor]) cursor = shiftUtcKey(cursor, -1);
    while (history[cursor]?.won) {
      streak += 1;
      cursor = shiftUtcKey(cursor, -1);
    }
  }

  playedStat.textContent = String(entries.length);
  winsStat.textContent = String(wins);
  streakStat.textContent = String(streak);
}

function chooseDailyAnswer() {
  const epoch = utcDateFromKey(config.epoch);
  const current = utcDateFromKey(currentDateKey);
  const daysSinceEpoch = Math.floor((current - epoch) / DAY_MS);
  dailyNumber = daysSinceEpoch + 1;
  const baseRotation = (config.rotation || []).filter((id) => heroById(id));
  const cycleIndex = Math.floor(daysSinceEpoch / baseRotation.length);
  const dayWithinCycle = positiveModulo(daysSinceEpoch, baseRotation.length);
  const activeRotation = rotationForCycle(baseRotation, cycleIndex);
  const answerId = activeRotation[dayWithinCycle] || heroes[0]?.id;
  return heroById(answerId);
}

function compareNumber(guessValue, answerValue) {
  if (guessValue === answerValue) return "exact";
  return guessValue < answerValue ? "higher" : "lower";
}

function comparisonsFor(hero) {
  return [
    { key: "origin", value: universeLabel(hero), result: hero.universe === answer.universe ? "exact" : "wrong" },
    { key: "trait", value: titleCase(playstyleFor(hero)), result: playstyleFor(hero) === playstyleFor(answer) ? "exact" : "wrong" },
    { key: "role", value: titleCase(roleFor(hero)), result: roleFor(hero) === roleFor(answer) ? "exact" : "wrong" },
    { key: "power", value: hero.power, result: compareNumber(hero.power, answer.power) },
    { key: "health", value: hero.health, result: compareNumber(hero.health, answer.health) },
    { key: "cost", value: hero.cost, result: compareNumber(hero.cost, answer.cost) }
  ];
}

function feedbackSymbol(result) {
  if (result === "exact") return "&#10003;";
  if (result === "higher") return "&#8593;";
  if (result === "lower") return "&#8595;";
  return "&#10005;";
}

function feedbackText(result) {
  if (result === "exact") return "Exact match";
  if (result === "higher") return "The target value is higher";
  if (result === "lower") return "The target value is lower";
  return "Does not match";
}

function createGuessCell(field) {
  const label = field.key === "health" ? "HP" : titleCase(field.key);
  return `
    <div class="guess-cell guess-cell--${field.key} guess-cell--${field.result}" aria-label="${label}: ${field.value}. ${feedbackText(field.result)}">
      <small>${label}</small>
      <strong>${field.value}</strong>
      <i aria-hidden="true">${feedbackSymbol(field.result)}</i>
    </div>`;
}

function createGuessRow(hero, index) {
  const isAnswer = hero.id === answer.id;
  return `
    <article class="guess-row" style="animation-delay:${Math.min(index * 45, 180)}ms" aria-label="Guess ${index + 1}: ${hero.name}">
      <div class="guess-cell guess-cell--hero guess-cell--${isAnswer ? "exact" : "wrong"}">
        <img src="${hero.image}" alt="">
        <div><small>Guess ${String(index + 1).padStart(2, "0")}</small><strong>${hero.name}</strong></div>
      </div>
      ${comparisonsFor(hero).map(createGuessCell).join("")}
    </article>`;
}

function renderGuessGrid() {
  const guessRows = state.guesses.map((id, index) => createGuessRow(heroById(id), index));
  const emptyRows = Array.from({ length: config.maxGuesses - state.guesses.length }, (_, index) => `
    <div class="guess-slot" aria-label="Empty guess ${state.guesses.length + index + 1}"><b>${String(state.guesses.length + index + 1).padStart(2, "0")}</b><span></span></div>`);
  guessGrid.innerHTML = [...guessRows, ...emptyRows].join("");

  const used = state.guesses.length;
  const remaining = Math.max(0, config.maxGuesses - used);
  attemptsUsed.textContent = String(used);
  attemptsRemaining.textContent = `${remaining} guess${remaining === 1 ? "" : "es"} remain`;
}

function remainingHeroes() {
  return heroes.filter((hero) => !state.guesses.includes(hero.id));
}

function renderSuggestions(query = "") {
  if (state.completed) return;
  const normalized = query.trim().toLowerCase();
  const matches = remainingHeroes()
    .filter((hero) => !normalized || hero.name.toLowerCase().includes(normalized))
    .slice(0, 8);

  heroSuggestions.innerHTML = matches.map((hero) => `
    <button class="hero-suggestion" type="button" role="option" data-hero-id="${hero.id}">
      <img src="${hero.image}" alt="">
      <span><strong>${hero.name}</strong><small>${universeLabel(hero)} // ${titleCase(playstyleFor(hero))}</small></span>
      <b>Select</b>
    </button>`).join("");
  heroSuggestions.hidden = matches.length === 0;
  guessInput.setAttribute("aria-expanded", String(matches.length > 0));
}

function updateSelectedHero() {
  const exact = remainingHeroes().find((hero) => hero.name.toLowerCase() === guessInput.value.trim().toLowerCase());
  selectedHeroId = exact?.id || null;
  guessButton.disabled = !selectedHeroId || state.completed;
}

function selectHero(heroId) {
  const hero = heroById(heroId);
  if (!hero || state.guesses.includes(heroId)) return;
  selectedHeroId = heroId;
  guessInput.value = hero.name;
  guessButton.disabled = false;
  heroSuggestions.hidden = true;
  guessInput.setAttribute("aria-expanded", "false");
  guessMessage.textContent = "";
  guessInput.focus();
  window.PRWAudio?.play("filter");
}

function finishPuzzle(won) {
  state.completed = true;
  state.won = won;
  saveState();
  recordResult();
  updateCompletedState();
  window.setTimeout(() => showResult({ playSound: true }), 650);
}

function submitGuess(event) {
  event.preventDefault();
  if (state.completed) return;

  updateSelectedHero();
  const hero = heroById(selectedHeroId);
  if (!hero) {
    guessMessage.textContent = "Select a hero from the active roster before submitting.";
    window.PRWAudio?.play("error");
    return;
  }

  state.guesses.push(hero.id);
  selectedHeroId = null;
  guessInput.value = "";
  guessButton.disabled = true;
  heroSuggestions.hidden = true;
  guessInput.setAttribute("aria-expanded", "false");
  guessMessage.textContent = hero.id === answer.id ? "Identity match confirmed." : "Signal compared. Use the new intelligence and try again.";
  saveState();
  renderGuessGrid();
  window.PRWAudio?.play(hero.id === answer.id ? "upgrade" : "deploy");

  if (hero.id === answer.id) {
    finishPuzzle(true);
  } else if (state.guesses.length >= config.maxGuesses) {
    finishPuzzle(false);
  } else {
    guessInput.focus();
  }
}

function updateCompletedState() {
  guessForm.hidden = state.completed;
  completedConsole.hidden = !state.completed;
  if (!state.completed) return;
  completedSummary.textContent = state.won
    ? `${answer.name} identified in ${state.guesses.length} attempt${state.guesses.length === 1 ? "" : "s"}.`
    : `Signal lost. Today's hero was ${answer.name}.`;
}

function showResult({ playSound = false, trigger = null } = {}) {
  if (!state.completed) return;
  resultTrigger = trigger;
  resultPanel.classList.toggle("is-defeat", !state.won);
  resultSignal.querySelector("span").innerHTML = state.won ? "&#10003;" : "&#10005;";
  resultKicker.textContent = state.won ? "Identity Confirmed" : "Transmission Failed";
  resultTitle.textContent = state.won ? "Target Acquired" : "Signal Lost";
  resultCopy.textContent = state.won
    ? `You decoded today's operative in ${state.guesses.length} of ${config.maxGuesses} attempts.`
    : "The archive has declassified the target. A new operative arrives at 00:00 UTC.";
  resultHeroImage.src = answer.image;
  resultHeroImage.alt = answer.name;
  resultHeroName.textContent = answer.name;
  resultHeroDetails.textContent = `${universeLabel(answer)} // ${titleCase(playstyleFor(answer))} // ${titleCase(roleFor(answer))}`;
  resultPanel.hidden = false;
  resultPanel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  resultPanel.querySelector(".daily-result__close").focus();
  if (playSound) window.PRWAudio?.play(state.won ? "victory" : "defeat");
}

function closeResult() {
  if (resultPanel.hidden) return;
  resultPanel.hidden = true;
  resultPanel.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.PRWAudio?.play("modalClose");
  resultTrigger?.focus();
  resultTrigger = null;
}

function shareGrid() {
  const resultRows = state.guesses.map((id) => comparisonsFor(heroById(id)).map((field) => {
    if (field.result === "exact") return "🟩";
    if (field.result === "higher") return "⬆️";
    if (field.result === "lower") return "⬇️";
    return "🟥";
  }).join(""));
  const score = state.won ? state.guesses.length : "X";
  return [
    `PalaRivals Watch Daily Hero #${dailyNumber} ${score}/${config.maxGuesses}`,
    ...resultRows,
    "Origin • Trait • Role • Power • HP • Cost"
  ].join("\n");
}

async function copyResult(button) {
  const text = shareGrid();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }

  const label = button.querySelector("span") || button;
  const original = label.textContent;
  label.textContent = "Copied!";
  window.PRWAudio?.play("purchase");
  window.setTimeout(() => { label.textContent = original; }, 1500);
}

function updateClocks() {
  const now = new Date();
  if (utcKey(now) !== currentDateKey) {
    window.location.reload();
    return;
  }

  const nextReset = utcDateFromKey(shiftUtcKey(currentDateKey, 1));
  const remaining = Math.max(0, nextReset - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const countdown = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  utcClock.textContent = now.toISOString().slice(11, 19);
  resetClock.textContent = countdown;
  resultResetClock.textContent = countdown;
}

function initializeInterface() {
  const numberLabel = String(Math.max(1, dailyNumber)).padStart(3, "0");
  puzzleNumber.textContent = `#${numberLabel}`;
  puzzleDate.textContent = currentDateKey.replaceAll("-", ".");
  stripDate.textContent = `${formatDateLabel(currentDateKey)} // CASE ${numberLabel}`;
  attemptLimit.textContent = String(config.maxGuesses);
  renderGuessGrid();
  renderStats();
  updateCompletedState();
  updateClocks();
  window.setInterval(updateClocks, 1000);

  if (state.completed) {
    recordResult();
    window.setTimeout(() => showResult(), 220);
  }
}

async function initializeDailyHero() {
  try {
    const [configResponse, heroResponse] = await Promise.all([
      fetch(DAILY_CONFIG_SOURCE),
      fetch(HERO_DATA_SOURCE)
    ]);
    if (!configResponse.ok || !heroResponse.ok) throw new Error("The daily archive could not be reached.");
    config = await configResponse.json();
    const heroData = await heroResponse.json();
    heroes = heroData.heroes || [];
    if (!heroes.length || !config.rotation?.length) throw new Error("The daily archive is empty.");

    currentDateKey = utcKey();
    answer = chooseDailyAnswer();
    if (!answer) throw new Error("Today's hero is missing from the active roster.");
    state = loadState();
    initializeInterface();
  } catch (error) {
    console.error("Daily Hero failed to initialize.", error);
    guessMessage.textContent = "The daily signal is unavailable. Reload the page to try reconnecting.";
    guessInput.disabled = true;
    guessButton.disabled = true;
  }
}

guessForm.addEventListener("submit", submitGuess);
guessInput.addEventListener("input", () => {
  updateSelectedHero();
  renderSuggestions(guessInput.value);
  guessMessage.textContent = "";
});
guessInput.addEventListener("focus", () => renderSuggestions(guessInput.value));
heroSuggestions.addEventListener("click", (event) => {
  const option = event.target.closest("[data-hero-id]");
  if (option) selectHero(option.dataset.heroId);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".guess-console")) {
    heroSuggestions.hidden = true;
    guessInput.setAttribute("aria-expanded", "false");
  }
});
showResultsButton.addEventListener("click", () => showResult({ trigger: showResultsButton }));
shareButton.addEventListener("click", () => copyResult(shareButton));
shareInlineButton.addEventListener("click", () => copyResult(shareInlineButton));
resultCloseButtons.forEach((button) => button.addEventListener("click", closeResult));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!resultPanel.hidden) closeResult();
  else {
    heroSuggestions.hidden = true;
    guessInput.setAttribute("aria-expanded", "false");
  }
});

initializeDailyHero();
