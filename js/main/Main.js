const MENU_THEMES = Object.freeze({
  default: {
    code: "PRW-00",
    status: "MULTIVERSE ONLINE",
    eyebrow: "Three worlds. One arena.",
    copy: "Build your squad. Outplay the lobby. Be the last team standing.",
    universe: "PalaRivals Watch",
    callout: "Choose Your World",
    primaryHero: "Img/Characters/MarvelRivals/IronManPNG.jpeg",
    secondaryHero: "Img/Characters/Overwatch/TracerPNG.png"
  },
  marvel: {
    code: "MR-01",
    status: "RIVALS NETWORK",
    eyebrow: "Multiversal combat protocol",
    copy: "Tear open the timeline. Draft impossible alliances and fight for the last reality standing.",
    universe: "Marvel Rivals",
    callout: "Rivals Assemble",
    primaryHero: "Img/Characters/MarvelRivals/IronManPNG.jpeg",
    secondaryHero: "Img/Characters/MarvelRivals/ThorPNG.jpeg"
  },
  paladins: {
    code: "RC-02",
    status: "REALM CONVERGENCE",
    eyebrow: "Champions of the shattered realm",
    copy: "Summon a legendary roster, command ancient power, and claim the Realm before rival champions do.",
    universe: "Paladins",
    callout: "The Realm Calls",
    primaryHero: "Img/Characters/Paladins/SerisPNG.png",
    secondaryHero: "Img/Characters/Paladins/RaumPNG.png"
  },
  overwatch: {
    code: "OW-76",
    status: "WATCHPOINT: GIBRALTAR",
    eyebrow: "Overwatch command // Recall active",
    copy: "The world needs heroes. Assemble a precision strike team, counter the opposition, and deploy from Watchpoint Gibraltar.",
    universe: "Overwatch",
    callout: "The World Needs Heroes",
    primaryHero: "Img/Characters/Overwatch/TracerPNG.png",
    secondaryHero: "Img/Characters/Overwatch/GenjiPNG.png"
  }
});

const COLOR_MODE_STORAGE_KEY = "palarivals-watch-color-mode";

const body = document.body;
const themeSwitches = [...document.querySelectorAll("[data-theme-switch]")];
const themeCode = document.querySelector("#ThemeCode");
const themeStatus = document.querySelector("#ThemeStatus");
const themeEyebrow = document.querySelector("#ThemeEyebrow");
const themeCopy = document.querySelector("#ThemeCopy");
const themeUniverse = document.querySelector("#ThemeUniverse");
const themeCallout = document.querySelector("#ThemeCallout");
const primaryHero = document.querySelector("#ThemeHeroPrimary");
const secondaryHero = document.querySelector("#ThemeHeroSecondary");
const colorModeButton = document.querySelector("#ColorModeButton");
const colorModeIcon = document.querySelector("#ColorModeIcon");
const colorModeLabel = document.querySelector("#ColorModeLabel");
const signupButton = document.querySelector("#SignupButton");
const loginButton = document.querySelector("#LoginButton");
const loginPanel = document.querySelector("#prwLoginPanel");
const authTitle = document.querySelector("#prwAuthTitle");
const authKicker = document.querySelector("#prwAuthKicker");
const authDescription = document.querySelector("#prwAuthDescription");
const authModeCode = document.querySelector("#prwAuthModeCode");
const authActionLabel = document.querySelector("#prwLoginButton span");
const authCloseButtons = [...document.querySelectorAll("[data-auth-close]")];
const usernameInput = document.querySelector("#prwUsernameInput");
const arcadeButton = document.querySelector("#ArcadeButton");
const arcadeMenu = document.querySelector("#ArcadeMenu");
const arcadeCloseButtons = [...document.querySelectorAll("[data-arcade-close]")];
const changeLogButton = document.querySelector("#ChangeLogButton");
const changeLogMenu = document.querySelector("#ChangeLogMenu");
const changeLogContent = document.querySelector("#ChangeLogContent");
const changeLogEntryCount = document.querySelector("#ChangeLogEntryCount");
const changeLogCloseButtons = [...document.querySelectorAll("[data-changelog-close]")];
const suggestionButton = document.querySelector("#SuggestionButton");
const suggestionMenu = document.querySelector("#SuggestionMenu");
const suggestionCloseButtons = [...document.querySelectorAll("[data-suggestion-close]")];
const suggestionForm = document.querySelector("#SuggestionForm");
const suggestionCategory = document.querySelector("#SuggestionCategory");
const suggestionPlayerName = document.querySelector("#SuggestionPlayerName");
const suggestionIdeaTitle = document.querySelector("#SuggestionIdeaTitle");
const suggestionDetails = document.querySelector("#SuggestionDetails");
const suggestionWebsite = document.querySelector("#SuggestionWebsite");
const suggestionTitleCount = document.querySelector("#SuggestionTitleCount");
const suggestionDetailsCount = document.querySelector("#SuggestionDetailsCount");
const suggestionQueueCount = document.querySelector("#SuggestionQueueCount");
const suggestionSubmit = document.querySelector("#SuggestionSubmit");
const suggestionResponse = document.querySelector("#SuggestionResponse");
const suggestionResponseKicker = document.querySelector("#SuggestionResponseKicker");
const suggestionResponseTitle = document.querySelector("#SuggestionResponseTitle");
const suggestionResponseMessage = document.querySelector("#SuggestionResponseMessage");
const suggestionAnother = document.querySelector("#SuggestionAnother");

const SUGGESTION_QUEUE_KEY = "palarivals-watch-suggestion-queue";
const SUGGESTION_REQUEST_TIMEOUT_MS = 12_000;

let transitionTimer;
let authMenuTrigger = null;
let arcadeMenuTrigger = null;
let changeLogMenuTrigger = null;
let suggestionMenuTrigger = null;

function readSavedColorMode() {
  try {
    const savedMode = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return savedMode === "light" || savedMode === "dark" ? savedMode : "dark";
  } catch {
    return "dark";
  }
}

function applyColorMode(mode, { persist = true } = {}) {
  const nextMode = mode === "light" ? "light" : "dark";
  const isLight = nextMode === "light";

  body.dataset.mode = nextMode;
  colorModeButton.setAttribute("aria-pressed", String(isLight));
  colorModeButton.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} mode`);
  colorModeButton.title = `Switch to ${isLight ? "dark" : "light"} mode`;
  colorModeIcon.textContent = isLight ? "☾" : "☀";
  colorModeLabel.textContent = isLight ? "Dark" : "Light";

  if (persist) {
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode);
    } catch {
      // The mode still works when browser storage is unavailable.
    }
  }
}

function applyTheme(themeName, { animate = true } = {}) {
  const theme = MENU_THEMES[themeName];

  if (!theme) {
    return;
  }

  const isNewTheme = body.dataset.theme !== themeName;

  if (animate && isNewTheme) {
    body.classList.add("theme-changing");
  }

  body.dataset.theme = themeName;
  window.PRWAudio?.setTheme(themeName);
  themeCode.textContent = theme.code;
  themeStatus.textContent = theme.status;
  themeEyebrow.textContent = theme.eyebrow;
  themeCopy.textContent = theme.copy;
  themeUniverse.textContent = theme.universe;
  themeCallout.textContent = theme.callout;
  primaryHero.src = theme.primaryHero;
  secondaryHero.src = theme.secondaryHero;

  themeSwitches.forEach((themeSwitch) => {
    const isSelected = themeSwitch.dataset.themeSwitch === themeName;
    themeSwitch.setAttribute("aria-pressed", String(isSelected));
  });

  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    body.classList.remove("theme-changing");
  }, isNewTheme && animate ? 360 : 0);
}

themeSwitches.forEach((themeSwitch) => {
  themeSwitch.addEventListener("click", () => {
    const selectedTheme = themeSwitch.dataset.themeSwitch;
    applyTheme(body.dataset.theme === selectedTheme ? "default" : selectedTheme);
  });
});

colorModeButton.addEventListener("click", () => {
  applyColorMode(body.dataset.mode === "dark" ? "light" : "dark");
});

function setAuthButtonState(isOpen) {
  signupButton?.setAttribute("aria-expanded", String(isOpen && loginPanel.dataset.authMode === "signup"));
  loginButton?.setAttribute("aria-expanded", String(isOpen && loginPanel.dataset.authMode === "login"));
}

function openAuthMenu(mode, trigger) {
  const isSignup = mode === "signup";

  closeArcadeMenu({ restoreFocus: false });
  closeChangeLog({ restoreFocus: false });
  closeSuggestionMenu({ restoreFocus: false });
  authMenuTrigger = trigger;
  loginPanel.dataset.authMode = isSignup ? "signup" : "login";
  authKicker.textContent = isSignup ? "New Challenger Registration" : "Account Uplink";
  authTitle.textContent = isSignup ? "Create Your Identity" : "Welcome Back, Hero";
  authDescription.textContent = isSignup
    ? "Create your PalaRivals Watch identity and prepare to enter the multiverse arena."
    : "Enter your credentials to reconnect with your PalaRivals Watch profile.";
  authModeCode.textContent = isSignup ? "SIGNUP // 02" : "LOGIN // 01";
  authActionLabel.textContent = isSignup ? "Create Account" : "Log In";
  loginPanel.hidden = false;
  loginPanel.setAttribute("aria-hidden", "false");
  body.classList.add("auth-menu-open");
  setAuthButtonState(true);
  window.PRWAudio?.play("modalOpen");
  window.requestAnimationFrame(() => usernameInput?.focus());
}

function closeAuthMenu() {
  if (loginPanel.hidden) {
    return;
  }

  loginPanel.hidden = true;
  loginPanel.setAttribute("aria-hidden", "true");
  body.classList.remove("auth-menu-open");
  setAuthButtonState(false);
  window.PRWAudio?.play("modalClose");
  authMenuTrigger?.focus();
  authMenuTrigger = null;
}

function openArcadeMenu(trigger) {
  closeAuthMenu();
  closeChangeLog({ restoreFocus: false });
  closeSuggestionMenu({ restoreFocus: false });
  arcadeMenuTrigger = trigger;
  arcadeMenu.hidden = false;
  arcadeMenu.setAttribute("aria-hidden", "false");
  arcadeButton?.setAttribute("aria-expanded", "true");
  body.classList.add("arcade-menu-open");
  window.PRWAudio?.play("modalOpen");
  arcadeMenu.querySelector(".arcade-mode-card--ability")?.focus();
}

function closeArcadeMenu({ restoreFocus = true } = {}) {
  if (!arcadeMenu || arcadeMenu.hidden) {
    return;
  }

  arcadeMenu.hidden = true;
  arcadeMenu.setAttribute("aria-hidden", "true");
  arcadeButton?.setAttribute("aria-expanded", "false");
  body.classList.remove("arcade-menu-open");
  window.PRWAudio?.play("modalClose");

  if (restoreFocus) {
    arcadeMenuTrigger?.focus();
  }

  arcadeMenuTrigger = null;
}

function escapeChangeLogHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatChangeLogInline(value) {
  return escapeChangeLogHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/==(.+?)==/g, "<mark>$1</mark>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*]+?)\*/g, "$1<em>$2</em>");
}

function renderChangeLog(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const output = [];
  let listTag = null;
  let entryOpen = false;
  let balanceOpen = false;
  let entryCount = 0;

  const closeList = () => {
    if (!listTag) return;
    output.push(`</${listTag}>`);
    listTag = null;
  };

  const openList = (tag) => {
    if (listTag === tag) return;
    closeList();
    output.push(`<${tag}>`);
    listTag = tag;
  };

  const closeBalance = () => {
    closeList();
    if (!balanceOpen) return;
    output.push("</div></section>");
    balanceOpen = false;
  };

  const closeEntry = () => {
    closeBalance();
    if (!entryOpen) return;
    output.push("</article>");
    entryOpen = false;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || (line.startsWith("<!--") && line.endsWith("-->"))) {
      closeList();
      return;
    }

    if (line === "---") {
      closeEntry();
      return;
    }

    if (line === ":::") {
      closeBalance();
      return;
    }

    if (line.startsWith("## ")) {
      closeEntry();
      entryCount += 1;
      entryOpen = true;
      output.push(`<article class="changelog-entry${entryCount === 1 ? " changelog-entry--latest" : ""}"><header><span>${String(entryCount).padStart(2, "0")}</span><h3>${formatChangeLogInline(line.slice(3))}</h3>${entryCount === 1 ? "<b>Latest</b>" : ""}</header>`);
      return;
    }

    if (!entryOpen && line.startsWith("# ")) {
      output.push(`<div class="changelog-intro"><h3>${formatChangeLogInline(line.slice(2))}</h3></div>`);
      return;
    }

    if (!entryOpen) return;

    const balanceMatch = line.match(/^:::\s*(buff|nerf|adjust|fix|new)\s+(.+)$/i);
    if (balanceMatch) {
      closeBalance();
      const balanceType = balanceMatch[1].toLowerCase();
      output.push(`<section class="changelog-balance changelog-balance--${balanceType}"><header><span>${balanceType}</span><h5>${formatChangeLogInline(balanceMatch[2])}</h5></header><div class="changelog-balance__body">`);
      balanceOpen = true;
      return;
    }

    if (balanceOpen && line.startsWith("Ability:")) {
      closeList();
      output.push(`<span class="changelog-balance__ability">Ability <b>${formatChangeLogInline(line.slice(8).trim())}</b></span>`);
      return;
    }

    if (balanceOpen && line.startsWith("Stat:")) {
      closeList();
      const [label = "Stat", previousValue = "—", nextValue = "—"] = line.slice(5).split("|").map((part) => part.trim());
      output.push(`<div class="changelog-balance__stat"><span>${formatChangeLogInline(label)}</span><del>${formatChangeLogInline(previousValue)}</del><i>→</i><ins>${formatChangeLogInline(nextValue)}</ins></div>`);
      return;
    }

    if (line.startsWith("Date:")) {
      closeList();
      output.push(`<time>${formatChangeLogInline(line.slice(5).trim())}</time>`);
    } else if (line.startsWith("Status:")) {
      closeList();
      output.push(`<span class="changelog-entry__status">${formatChangeLogInline(line.slice(7).trim())}</span>`);
    } else if (line.startsWith("### ")) {
      closeBalance();
      output.push(`<h4>${formatChangeLogInline(line.slice(4))}</h4>`);
    } else if (line.startsWith("#### ")) {
      closeList();
      output.push(`<h5 class="changelog-entry__subheading">${formatChangeLogInline(line.slice(5))}</h5>`);
    } else if (line.startsWith("- ")) {
      openList("ul");
      output.push(`<li>${formatChangeLogInline(line.slice(2))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      openList("ol");
      output.push(`<li>${formatChangeLogInline(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else if (line.startsWith("> ")) {
      closeList();
      const callout = line.match(/^>\s*\[!(note|tip|warning|buff|nerf|fix)\]\s*(.*)$/i);
      output.push(callout
        ? `<blockquote class="changelog-callout changelog-callout--${callout[1].toLowerCase()}"><b>${callout[1]}</b><span>${formatChangeLogInline(callout[2])}</span></blockquote>`
        : `<blockquote>${formatChangeLogInline(line.slice(2))}</blockquote>`);
    } else {
      closeList();
      output.push(`<p>${formatChangeLogInline(line)}</p>`);
    }
  });

  closeEntry();
  return { html: output.join(""), entryCount };
}

async function loadChangeLog() {
  changeLogContent.setAttribute("aria-busy", "true");
  changeLogContent.innerHTML = '<div class="changelog-menu__loading"><i></i><span>Loading development archive&hellip;</span></div>';
  changeLogEntryCount.textContent = "Synchronizing";

  try {
    const response = await fetch("data/changelog.md", { cache: "no-store" });
    if (!response.ok) throw new Error(`Change log request failed with ${response.status}`);
    const rendered = renderChangeLog(await response.text());
    changeLogContent.innerHTML = rendered.html || '<div class="changelog-menu__empty">No change log entries have been published yet.</div>';
    changeLogEntryCount.textContent = `${rendered.entryCount} ${rendered.entryCount === 1 ? "entry" : "entries"} archived`;
  } catch (error) {
    console.error("Unable to load the change log.", error);
    changeLogContent.innerHTML = '<div class="changelog-menu__error"><strong>Archive unavailable</strong><span>Make sure <code>data/changelog.md</code> exists and the site is running through a web server.</span></div>';
    changeLogEntryCount.textContent = "Feed offline";
  } finally {
    changeLogContent.setAttribute("aria-busy", "false");
  }
}

function openChangeLog(trigger) {
  closeAuthMenu();
  closeArcadeMenu({ restoreFocus: false });
  closeSuggestionMenu({ restoreFocus: false });
  changeLogMenuTrigger = trigger;
  changeLogMenu.hidden = false;
  changeLogMenu.setAttribute("aria-hidden", "false");
  changeLogButton?.setAttribute("aria-expanded", "true");
  body.classList.add("changelog-menu-open");
  window.PRWAudio?.play("modalOpen");
  loadChangeLog();
  window.requestAnimationFrame(() => changeLogMenu.querySelector(".changelog-menu__close")?.focus());
}

function closeChangeLog({ restoreFocus = true } = {}) {
  if (!changeLogMenu || changeLogMenu.hidden) return;
  changeLogMenu.hidden = true;
  changeLogMenu.setAttribute("aria-hidden", "true");
  changeLogButton?.setAttribute("aria-expanded", "false");
  body.classList.remove("changelog-menu-open");
  window.PRWAudio?.play("modalClose");
  if (restoreFocus) changeLogMenuTrigger?.focus();
  changeLogMenuTrigger = null;
}

function readSuggestionQueue() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SUGGESTION_QUEUE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeSuggestionQueue(queue) {
  try {
    window.localStorage.setItem(SUGGESTION_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Submission status still explains when browser storage is unavailable.
  }
  updateSuggestionQueueCount();
}

function updateSuggestionQueueCount() {
  if (suggestionQueueCount) suggestionQueueCount.textContent = readSuggestionQueue().length;
}

function updateSuggestionCounters() {
  if (suggestionTitleCount) suggestionTitleCount.textContent = suggestionIdeaTitle?.value.length || 0;
  if (suggestionDetailsCount) suggestionDetailsCount.textContent = suggestionDetails?.value.length || 0;
}

function createSuggestionPayload() {
  return {
    clientSubmissionId: window.crypto?.randomUUID?.() || `suggestion-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: suggestionCategory.value,
    playerName: suggestionPlayerName.value.trim() || "Anonymous Commander",
    title: suggestionIdeaTitle.value.trim(),
    details: suggestionDetails.value.trim(),
    website: suggestionWebsite.value,
    submittedAt: new Date().toISOString(),
    context: {
      page: "main-menu",
      theme: body.dataset.theme || "default",
      colorMode: body.dataset.mode || "dark"
    }
  };
}

async function transmitSuggestion(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SUGGESTION_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || "The suggestion channel is currently unavailable.");
      error.status = response.status;
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The suggestion channel took too long to respond.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function flushSuggestionQueue() {
  const queue = readSuggestionQueue();
  if (!queue.length) return;
  const remaining = [...queue];
  while (remaining.length) {
    try {
      await transmitSuggestion(remaining[0]);
      remaining.shift();
      writeSuggestionQueue(remaining);
    } catch {
      break;
    }
  }
}

function showSuggestionResponse({ storedOnline }) {
  suggestionForm.hidden = true;
  suggestionResponse.hidden = false;
  suggestionResponse.dataset.state = storedOnline ? "online" : "local";
  suggestionResponseKicker.textContent = storedOnline ? "Transmission Complete" : "Transmission Queued";
  suggestionResponseTitle.textContent = storedOnline ? "Idea Received" : "Saved on This Device";
  suggestionResponseMessage.textContent = storedOnline
    ? "Your suggestion was added to the shared development JSON channel. Thank you for helping shape the game."
    : "The shared channel did not respond, so this idea is safely queued in your browser and will retry automatically later.";
  window.setTimeout(() => suggestionAnother?.focus(), 30);
}

function resetSuggestionForm() {
  suggestionForm.reset();
  suggestionForm.hidden = false;
  suggestionResponse.hidden = true;
  suggestionResponse.removeAttribute("data-state");
  updateSuggestionCounters();
  window.setTimeout(() => suggestionCategory?.focus(), 30);
}

async function handleSuggestionSubmit(event) {
  event.preventDefault();
  if (!suggestionForm.reportValidity()) return;
  const payload = createSuggestionPayload();
  suggestionSubmit.disabled = true;
  suggestionSubmit.querySelector("span").textContent = "Transmitting...";
  let storedOnline = false;
  try {
    await transmitSuggestion(payload);
    storedOnline = true;
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 404) {
      suggestionDetails.setCustomValidity(error.message);
      suggestionDetails.reportValidity();
      suggestionDetails.setCustomValidity("");
      return;
    }
    const queue = readSuggestionQueue();
    if (!queue.some((entry) => entry.clientSubmissionId === payload.clientSubmissionId)) queue.push(payload);
    writeSuggestionQueue(queue.slice(-50));
  } finally {
    suggestionSubmit.disabled = false;
    suggestionSubmit.querySelector("span").textContent = "Transmit Suggestion";
  }
  showSuggestionResponse({ storedOnline });
  window.PRWAudio?.play("heal");
}

function openSuggestionMenu(trigger) {
  closeAuthMenu();
  closeArcadeMenu({ restoreFocus: false });
  closeChangeLog({ restoreFocus: false });
  suggestionMenuTrigger = trigger;
  suggestionMenu.hidden = false;
  suggestionMenu.setAttribute("aria-hidden", "false");
  suggestionButton?.setAttribute("aria-expanded", "true");
  body.classList.add("suggestion-menu-open");
  updateSuggestionQueueCount();
  flushSuggestionQueue();
  window.PRWAudio?.play("modalOpen");
  window.setTimeout(() => suggestionIdeaTitle?.focus(), 30);
}

function closeSuggestionMenu({ restoreFocus = true } = {}) {
  if (!suggestionMenu || suggestionMenu.hidden) return;
  suggestionMenu.hidden = true;
  suggestionMenu.setAttribute("aria-hidden", "true");
  suggestionButton?.setAttribute("aria-expanded", "false");
  body.classList.remove("suggestion-menu-open");
  window.PRWAudio?.play("modalClose");
  if (restoreFocus) suggestionMenuTrigger?.focus();
  suggestionMenuTrigger = null;
}

signupButton?.addEventListener("click", () => openAuthMenu("signup", signupButton));
loginButton?.addEventListener("click", () => openAuthMenu("login", loginButton));
authCloseButtons.forEach((closeButton) => closeButton.addEventListener("click", closeAuthMenu));
arcadeButton?.addEventListener("click", () => openArcadeMenu(arcadeButton));
arcadeCloseButtons.forEach((closeButton) => closeButton.addEventListener("click", closeArcadeMenu));
changeLogButton?.addEventListener("click", () => openChangeLog(changeLogButton));
changeLogCloseButtons.forEach((closeButton) => closeButton.addEventListener("click", closeChangeLog));
suggestionButton?.addEventListener("click", () => openSuggestionMenu(suggestionButton));
suggestionCloseButtons.forEach((closeButton) => closeButton.addEventListener("click", closeSuggestionMenu));
suggestionForm?.addEventListener("submit", handleSuggestionSubmit);
suggestionIdeaTitle?.addEventListener("input", updateSuggestionCounters);
suggestionDetails?.addEventListener("input", updateSuggestionCounters);
suggestionAnother?.addEventListener("click", resetSuggestionForm);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAuthMenu();
    closeArcadeMenu();
    closeChangeLog();
    closeSuggestionMenu();
  }
});

applyColorMode(readSavedColorMode(), { persist: false });
applyTheme("default", { animate: false });
updateSuggestionQueueCount();
