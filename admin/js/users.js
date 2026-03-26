document.addEventListener('app-initialized', () => {
    if (document.body.id === 'users-page') {
        // Initial data load
        loadUserList();
        loadUserAnalytics();
        loadTopContributors();

        // Real-time updates
        document.addEventListener('user-analytics-updated', e => {
            document.getElementById('active-users-today').innerText = e.detail.activeUsersToday || 0;
        });

        // Search functionality
        const searchInput = document.getElementById('user-search');
        searchInput.addEventListener('input', () => loadUserList(searchInput.value));
    }
});

async function loadUserAnalytics() {
    try {
        const res = await fetch('/api/analytics/users');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('active-users-today').innerText = data.activeUsersToday || 0;
        }
    } catch (error) {
        console.error('Failed to load user analytics:', error);
    }
}

async function loadTopContributors() {
    const list = document.getElementById('top-contributors-list');
    if (!list) return;
    try {
        const res = await fetch('/api/top-contributors');
        if (res.ok) {
            const contributors = await res.json();
            if (contributors.length > 0) {
                list.innerHTML = contributors.map(c => `<li class="list-group-item d-flex justify-content-between align-items-center">${c.name} <span class="badge bg-primary rounded-pill">${c.count}</span></li>`).join('');
            } else {
                list.innerHTML = '<li class="list-group-item">No contributors yet.</li>';
            }
        }
    } catch (error) {
        console.error('Failed to load top contributors:', error);
    }
}

async function loadUserList(searchTerm = '') {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    try {
        const res = await fetch('/api/users');
        let users = await res.json();

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            users = users.filter(user => 
                (user.name && user.name.toLowerCase().includes(lowercasedTerm)) || 
                (user.email && user.email.toLowerCase().includes(lowercasedTerm))
            );
        }

        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">No users found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.totalScans || 0}</td>
                <td>${user.createdAt}</td>
                <td>${user.lastActiveAt}</td>
                <td><button class="btn btn-sm btn-danger delete-btn" data-id="${user.id}">Delete</button></td>
            </tr>
        `).join('');

        // Re-attach event listeners for delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this user? This action is permanent.')) {
                    await deleteUser(userId, searchTerm);
                }
            });
        });
    } catch (err) {
        console.error('Error loading users:', err);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading users.</td></tr>`;
    }
}

async function deleteUser(userId, searchTerm) {
    try {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete user.');
        
        // Refresh all user-related data on the page for consistency
        loadUserList(searchTerm);
        loadUserAnalytics();
        loadTopContributors();

    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user.');
    }
}
