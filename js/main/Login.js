const PRW_AUTH_SESSION_KEY = "prw.auth.session";
const authPanel = document.querySelector("#prwLoginPanel");
const authForm = document.querySelector("#prwAuthForm");
const authSubmitButton = document.querySelector("#prwLoginButton");
const authUsernameInput = document.querySelector("#prwUsernameInput");
const authPasswordInput = document.querySelector("#prwPasswordInput");
const authMessage = document.querySelector("#prwAuthMessage");
const authSignupButton = document.querySelector("#SignupButton");
const authLoginButton = document.querySelector("#LoginButton");
const accountButton = document.querySelector("#AccountButton");

function readAuthSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(PRW_AUTH_SESSION_KEY));
    if (!session || typeof session.username !== "string" || !session.username.trim()) return null;
    return session;
  } catch {
    return null;
  }
}

function writeAuthSession(user) {
  const session = {
    id: user.id,
    username: user.username,
    token: user.token,
    authenticatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PRW_AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

function renderAccountState() {
  const session = readAuthSession();
  authSignupButton?.classList.toggle("hidden", Boolean(session));
  authLoginButton?.classList.toggle("hidden", Boolean(session));
  accountButton?.classList.toggle("hidden", !session);

  if (accountButton && session) {
    accountButton.textContent = "Account";
    accountButton.title = `Open ${session.username}'s profile`;
    accountButton.setAttribute("aria-label", `Open profile for ${session.username}`);
  }
}

function setAuthMessage(message, state = "error") {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.dataset.state = state;
  authMessage.hidden = !message;
}

function clearInputErrors() {
  [authUsernameInput, authPasswordInput].forEach((input) => input?.removeAttribute("aria-invalid"));
}

function validateAuthFields() {
  const username = authUsernameInput?.value.trim() || "";
  const password = authPasswordInput?.value || "";

  clearInputErrors();

  if (username.length < 3 || username.length > 50) {
    authUsernameInput?.setAttribute("aria-invalid", "true");
    authUsernameInput?.focus();
    return { error: "Username must be between 3 and 50 characters." };
  }

  if (password.length < 6 || password.length > 30) {
    authPasswordInput?.setAttribute("aria-invalid", "true");
    authPasswordInput?.focus();
    return { error: "Password must be between 6 and 30 characters." };
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    authPasswordInput?.setAttribute("aria-invalid", "true");
    authPasswordInput?.focus();
    return { error: "Password must include an uppercase letter, a lowercase letter, and a number." };
  }

  return { username, password };
}

function setAuthLoading(loading, mode) {
  if (!authSubmitButton) return;
  authSubmitButton.disabled = loading;
  authSubmitButton.classList.toggle("is-loading", loading);
  const label = authSubmitButton.querySelector("span");
  if (label) label.textContent = loading
    ? (mode === "signup" ? "Creating Identity…" : "Connecting…")
    : (mode === "signup" ? "Create Account" : "Log In");
}

async function parseAuthResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The account API did not return a valid response. Run the project through Vercel Dev or deploy it to Vercel.");
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The account request failed.");
  return data;
}

async function submitAuthentication(event) {
  event.preventDefault();
  const fields = validateAuthFields();
  if (fields.error) {
    setAuthMessage(fields.error);
    window.PRWAudio?.play("error");
    return;
  }

  const mode = authPanel?.dataset.authMode === "signup" ? "signup" : "login";
  setAuthMessage("");
  setAuthLoading(true, mode);

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode, username: fields.username, password: fields.password }),
    });
    const data = await parseAuthResponse(response);
    const session = writeAuthSession(data.user);
    authPasswordInput.value = "";
    setAuthMessage(data.message, "success");
    renderAccountState();
    window.PRWAudio?.play("heal");
    document.dispatchEvent(new CustomEvent("prw:auth-success", { detail: session }));
  } catch (error) {
    setAuthMessage(error.message || "Unable to connect to the account service.");
    window.PRWAudio?.play("error");
  } finally {
    setAuthLoading(false, mode);
  }
}

authForm?.addEventListener("submit", submitAuthentication);
authUsernameInput?.addEventListener("input", () => {
  authUsernameInput.removeAttribute("aria-invalid");
  if (authMessage?.dataset.state === "error") setAuthMessage("");
});
authPasswordInput?.addEventListener("input", () => {
  authPasswordInput.removeAttribute("aria-invalid");
  if (authMessage?.dataset.state === "error") setAuthMessage("");
});
accountButton?.addEventListener("click", () => {
  window.location.href = "Profile.html";
});
window.addEventListener("storage", renderAccountState);

renderAccountState();
