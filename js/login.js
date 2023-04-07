const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginLink = document.getElementById("login-link");
const registerLink = document.getElementById("register-link");

// Hide the registration form initially
registerForm.style.display = "none";

// Add event listeners to the login and registration links
loginLink.addEventListener("click", () => {
  loginForm.style.display = "block";
  registerForm.style.display = "none";
});

registerLink.addEventListener("click", () => {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
});