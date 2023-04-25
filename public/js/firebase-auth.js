const auth = firebase.auth();

const registerForm1 = document.querySelector('#register-form');
const registerSubmitBtn = registerForm1.querySelector('button[type="submit"]');

const loginForm1 = document.querySelector('#login-form');
const loginSubmitBtn = loginForm1.querySelector('button[type="submit"]');

registerSubmitBtn.addEventListener('click', (event) => {
  event.preventDefault();

    const registerUsername = registerForm1.querySelector('.username').value;
    const registerEmail = registerForm1.querySelector('.email').value;
    const registerPassword = registerForm1.querySelector('.password').value;
    const registerRetypePassword = registerForm1.querySelector('.retype-password').value;

    console.log(registerUsername);
    console.log(registerEmail);
    console.log(registerPassword);
    console.log(registerRetypePassword);

    if (registerPassword===registerRetypePassword) {
        auth.createUserWithEmailAndPassword(registerEmail, registerPassword)
        .then((userCredential) => {
          const user = userCredential.user;
          // TODO: Enter to the main screen.
          window.location.href = "/";
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          console.log(errorCode);
          console.log(errorMessage);
        });
    }
    else {
        alert("Passwords do not match");
    }

});

loginSubmitBtn.addEventListener('click', (event) => {
    event.preventDefault();
  
      const loginEmail = loginForm1.querySelector('.email').value;
      const loginPassword = loginForm1.querySelector('.password').value;
  
      console.log(loginEmail);
      console.log(loginPassword);
  
    auth.signInWithEmailAndPassword(loginEmail, loginPassword)
        .then((userCredential) => {
          const user = userCredential.user;
          // TODO: Enter to the main screen.
          window.location.href = "/";
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;

          console.log(errorCode);
          console.log(errorMessage);
        });
      }
  
);
