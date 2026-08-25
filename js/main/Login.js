
const LoginButton = document.getElementById("LoginButton");
const SignupButton = document.getElementById("SignupButton");
const SubmitButton = document.getElementById("prwLoginButton");
const UsernameInput = document.getElementById("prwUsernameInput");
const PasswordInput = document.getElementById("prwPasswordInput");

Login = true;

LoginButton.addEventListener("click", () => Login = true);
SignupButton.addEventListener("click", () => Login = false);
SubmitButton.addEventListener("click", () => submitClicked());

async function submitClicked(){
    if (Login){
        tryLogin();
    } else {
        trySignUp();
    }
}

async function tryLogin(){
    const users = await getUsers(UsernameInput.value);
    console.log(users.Username);
    console.log("PLEASE WORK");
}

async function trySignUp(){

}

async function getUsers(Username) {
    let api = `/api/getuser`;
    if (Username !== undefined && Username !== ""){
        api += `?username=${encodeURIComponent(Username)}`
    }
    const response = await fetch(api);
    const users = await response.json();
    return users;
}

async function getUserID(Username) {
    let api = `/api/getuserid`;
        if (Username !== undefined){
        api += `?username=${encodeURIComponent(Username)}`
    }
    const response = await fetch(api);
    const data = await response.json();
    const userID = data.UserID;
    return userID;
}