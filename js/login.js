const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginLink = document.getElementById("login-link");
const registerLink = document.getElementById("register-link");

const user = {
  username: 'johndoe',
  email: 'johndoe@example.com',
  password: 'mypassword',
  retype_password: 'mypassword'
};

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

/*const registerForm1 = document.querySelector('#register-form');
const registerInputs = registerForm1.querySelectorAll('#register-form input');
const submitBtn = registerForm1.querySelector('button[type="submit"]');

submitBtn.addEventListener('click', (event) => {
  event.preventDefault();

  const formData = {};
  registerInputs.forEach(input => {
    formData[input.name] = input.value;
  });

});*/