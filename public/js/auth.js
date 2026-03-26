const firebaseConfig = {
  apiKey: "AIzaSyAoKcWnEnWJmJxtwOVtMC7pOsgmMQJxyqQ",
  authDomain: "aquacon-dbfdb.firebaseapp.com",
  projectId: "aquacon-dbfdb",
  storageBucket: "aquacon-dbfdb.appspot.com",
  messagingSenderId: "902705330165",
  appId: "1:902705330165:web:a67432cc40995bdfd012bc"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('login-error');

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const idToken = await userCredential.user.getIdToken();

                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                });

                if (response.ok) {
                    window.location.href = '/admin/dashboard.html';
                } else {
                    const error = await response.json();
                    errorElement.innerText = error.message || 'Login failed.';
                    errorElement.style.display = 'block';
                }
            } catch (error) {
                errorElement.innerText = error.message;
                errorElement.style.display = 'block';
            }
        });
    }
});
