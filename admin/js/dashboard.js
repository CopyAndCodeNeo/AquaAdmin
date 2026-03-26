document.addEventListener('app-initialized', () => {
    if (document.body.id === 'dashboard-page') {
        // Initial data load
        loadDashboardStats();
        loadRecentScans();
        loadActivityFeed();
        loadTopContributors();

        // Listen for real-time updates
        document.addEventListener('stats-update', e => updateDashboardStats(e.detail));
        document.addEventListener('new-scan-received', e => addScanToTable(e.detail));
        document.addEventListener('new-activity-received', e => addActivityToFeed(e.detail));
    }
});

// --- DATA LOADING & RENDERING FUNCTIONS ---

function updateDashboardStats(stats) {
    document.getElementById("total-scans").innerText = stats.totalScans || 0;
    document.getElementById("total-users").innerText = stats.totalUsers || 0;
    document.getElementById("fish-freshness-identified").innerText = stats.fishFreshnessIdentified || 0;
    document.getElementById("new-scans-today").innerText = stats.newScansToday || 0;
    document.getElementById("dataset-size").innerText = stats.datasetSize || 0;
}

function renderScanRow(scan) {
    const uploadDate = scan.uploadDate && scan.uploadDate._seconds ? new Date(scan.uploadDate._seconds * 1000).toLocaleString() : 'N/A';
    return `
        <tr>
            <td>${scan.id}</td>
            <td>${scan.userName || "Unknown User"}</td>
            <td><img src="${scan.imageUrl || ''}" alt="Scan preview" width="60" style="object-fit: cover; height: 40px;" onerror="this.style.display='none'"></td>
            <td>${scan.freshness || "N/A"}</td>
            <td>${scan.confidence ? (scan.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
            <td>${uploadDate}</td>
            <td><span class="badge bg-success">${scan.status || 'Verified'}</span></td>
        </tr>
    `;
}

function addScanToTable(scan) {
    const scanTableBody = document.getElementById('recent-scans-body');
    if (scanTableBody) {
        const newRow = renderScanRow(scan);
        scanTableBody.insertAdjacentHTML('afterbegin', newRow);
        // Keep the table limited to 10 entries
        while (scanTableBody.rows.length > 10) {
            scanTableBody.deleteRow(scanTableBody.rows.length - 1);
        }
    }
}

function addActivityToFeed(activity) {
    const activityList = document.getElementById('recent-activity-list');
    if (activityList) {
        const newActivity = `<li class="list-group-item">${activity.message}</li>`;
        activityList.insertAdjacentHTML('afterbegin', newActivity);
        // Keep the list limited to 10 entries
        while (activityList.children.length > 10) {
            activityList.removeChild(activityList.lastChild);
        }
    }
}

// --- API FETCH FUNCTIONS ---

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/dashboard-stats');
        if (res.ok) updateDashboardStats(await res.json());
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

async function loadRecentScans() {
    try {
        const res = await fetch('/api/recent-scans');
        if (res.ok) {
            const scans = await res.json();
            const scanTableBody = document.getElementById('recent-scans-body');
            if (scanTableBody) scanTableBody.innerHTML = scans.map(renderScanRow).join('');
        }
    } catch (error) {
        console.error('Failed to load recent scans:', error);
    }
}

async function loadActivityFeed() {
    try {
        const res = await fetch('/api/activity-feed');
        if (res.ok) {
            const activities = await res.json();
            const activityList = document.getElementById('recent-activity-list');
            if (activityList) activityList.innerHTML = activities.map(act => `<li class="list-group-item">${act.message}</li>`).join('');
        }
    } catch (error) {
        console.error('Failed to load activity feed:', error);
    }
}

async function loadTopContributors() {
    try {
        const res = await fetch('/api/top-contributors');
        if (res.ok) {
            const contributors = await res.json();
            const contributorsList = document.getElementById('top-contributors-list');
            if (contributorsList) contributorsList.innerHTML = contributors.map((c, i) => `<li class="list-group-item">${i + 1}. ${c.name} (${c.count} scans)</li>`).join('');
        }
    } catch (error) {
        console.error('Failed to load top contributors:', error);
    }
}