
const LoginButton = document.getElementById("LoginButton");
const SignupButton = document.getElementById("SignupButton");
const SubmitButton = document.getElementById("prwLoginButton");
const UsernameInput = document.getElementById("prwUsernameInput");
const PasswordInput = document.getElementById("prwPasswordInput");

Login = true;

LoginButton.addEventListener("click", () => Login = true);
SignupButton.addEventListener("click", () => Login = false);
SubmitButton.addEventListener("click", () => getUsers());

async function getUsers() {
    const response = await fetch("/api/getuser");

    console.log("Status:", response.status);
    console.log("Content-Type:", response.headers.get("content-type"));

    const text = await response.text();

    console.log("Response:", text);
}