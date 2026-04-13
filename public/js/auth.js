// NOTE: It is safe for this configuration to be public.
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

// --- Function to handle backend login and redirect ---
async function completeLogin(idToken) {
    const errorElement = document.getElementById('login-error');
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
            credentials: 'same-origin'
        });

        console.log('Login debug: /api/auth/login status =', response.status);

        const payload = await response.json().catch(() => ({}));
        console.log('Login debug: /api/auth/login payload =', payload);

        if (response.ok) {
            const sessionProbe = await fetch('/api/auth/status', { credentials: 'same-origin' });
            console.log('Login debug: /api/auth/status after login =', sessionProbe.status);
            window.location.href = '/admin/dashboard.html';
        } else {
            errorElement.innerText = payload.message || 'Admin verification failed.';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        console.error('Login debug: completeLogin exception =', error);
        errorElement.innerText = 'An error occurred during login. Please try again.';
        errorElement.style.display = 'block';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('login-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const errorElement = document.getElementById('login-error');

    // --- Handle Firebase Redirect Result ---
    // This is the core fix for the blank page issue.
    auth.getRedirectResult()
        .then(async (result) => {
            if (result.user) {
                console.log('Redirect result received, user is authenticated.');
                const idToken = await result.user.getIdToken();
                await completeLogin(idToken);
            }
        })
        .catch((error) => {
            console.error('Error during redirect result:', error);
            errorElement.innerText = error.message;
            errorElement.style.display = 'block';
        });

    // --- Handle Email/Password Form Submission ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const idToken = await userCredential.user.getIdToken();
                await completeLogin(idToken);
            } catch (error) {
                errorElement.innerText = error.message;
                errorElement.style.display = 'block';
            }
        });
    }

    // --- Handle Google Sign-In Button Click ---
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithRedirect(provider);
        });
    }
});
