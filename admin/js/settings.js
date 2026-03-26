document.addEventListener('app-initialized', ({ detail }) => {
    if (document.body.id === 'settings-page') {
        const { user } = detail;
        populateSettings(user);
        setupFormListeners(user);
    }
});

function populateSettings(user) {
    if (!user) return;

    // Populate Admin Profile form
    document.getElementById('admin-profile-name').value = user.displayName || '';
    document.getElementById('admin-profile-email').value = user.email || '';

    // Populate App Configuration
    document.getElementById('fb-project-id').innerText = firebase.app().options.projectId;
}

function setupFormListeners(user) {
    // Profile Update Form
    const profileForm = document.getElementById('admin-profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('admin-profile-name').value;
        const email = document.getElementById('admin-profile-email').value;

        try {
            const response = await fetch(`/api/users/${user.uid}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            });

            if (!response.ok) {
                throw new Error('Failed to update profile.');
            }

            alert('Profile updated successfully!');
            sessionStorage.setItem('adminName', name); // Update session storage
            document.getElementById('admin-name').innerText = name; // Update UI immediately
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile.');
        }
    });

    // Password Change Form (Placeholder)
    const passwordForm = document.getElementById('change-password-form');
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Password change functionality is not implemented in this demo. This would typically involve re-authenticating the user and calling Firebase Auth updatePassword method.');
    });
}
