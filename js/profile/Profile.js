const PROFILE_AUTH_SESSION_KEY = "prw.auth.session";
const profileTitle = document.querySelector("#ProfileTitle");
const profileStatus = document.querySelector(".profile-status");
const logOutButton = document.querySelector("#LogOut");

function readProfileSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(PROFILE_AUTH_SESSION_KEY));
    return session && typeof session.username === "string" ? session : null;
  } catch {
    return null;
  }
}

function renderProfileIdentity() {
  const session = readProfileSession();

  if (profileTitle) {
    profileTitle.textContent = session
      ? `${session.username}'s Command Profile`
      : "No Player Identity Connected";
  }

  if (profileStatus) {
    const userCode = session?.id == null ? "PRW-GUEST" : `PRW-${String(session.id).padStart(3, "0")}`;
    const indicator = document.createElement("i");
    const code = document.createElement("span");
    code.textContent = userCode;
    profileStatus.replaceChildren(indicator, ` ${session ? "Online" : "Offline"} `, code);
  }

  if (logOutButton) {
    logOutButton.textContent = session ? "Log Out" : "Return to Sign In";
  }
}

logOutButton?.addEventListener("click", () => {
  window.localStorage.removeItem(PROFILE_AUTH_SESSION_KEY);
  window.location.href = "Main.html";
});

renderProfileIdentity();
