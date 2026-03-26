document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        const { user } = await response.json();
        initializePage(user);
    } catch (error) {
        window.location.href = '/';
    }
});

function initializePage(user) {
    if (user && user.name) {
        document.getElementById("admin-name").innerText = user.name;
    }

    const logoutBtn = document.getElementById("logout-btn-top");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = "/";
        });
    }

    const menuToggle = document.getElementById("menu-toggle");
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            document.getElementById("wrapper").classList.toggle("toggled");
        });
    }

    // Initialize Socket.IO connection
    const socket = io();

    // Listen for real-time events and dispatch them as DOM events
    socket.on('dashboard-stats-update', (data) => {
        document.dispatchEvent(new CustomEvent('stats-update', { detail: data }));
    });

    socket.on('new-scan', (data) => {
        document.dispatchEvent(new CustomEvent('new-scan-received', { detail: data }));
    });

    socket.on('new-activity', (data) => {
        document.dispatchEvent(new CustomEvent('new-activity-received', { detail: data }));
    });

    socket.on('training-data-update', (data) => {
        document.dispatchEvent(new CustomEvent('training-data-stats-update', { detail: data }));
    });

    socket.on('new-training-image', (data) => {
        document.dispatchEvent(new CustomEvent('new-training-image-received', { detail: data }));
    });

    socket.on('user-analytics-update', (data) => {
        document.dispatchEvent(new CustomEvent('user-analytics-updated', { detail: data }));
    });

    // Dispatch a custom event to signal that the main app is initialized
    document.dispatchEvent(new CustomEvent('app-initialized', { detail: { user } }));
}
