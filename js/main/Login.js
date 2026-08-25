
const LoginButton = document.getElementById("LoginButton");
const SignupButton = document.getElementById("SignupButton");
const SubmitButton = document.getElementById("prwLoginButton");
const UsernameInput = document.getElementById("prwUsernameInput");
const PasswordInput = document.getElementById("prwPasswordInput");

Login = true;

LoginButton.addEventListener("click", () => Login = true);
SignupButton.addEventListener("click", () => Login = false);
SubmitButton.addEventListener("click", () => getUsers());

async function getUsers(Username) {

    const response = await fetch("/api/getuser");
    const users = await response.json();
    console.log(users);
    
}