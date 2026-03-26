document.addEventListener('app-initialized', () => {
    if (document.body.id === 'logs-page') {
        loadLogs();

        const filterForm = document.getElementById('logs-filter-form');
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loadLogs();
        });
    }
});

async function loadLogs() {
    const eventType = document.getElementById('event-type-filter').value;
    const date = document.getElementById('date-filter').value;
    const logsTableBody = document.getElementById('logs-table-body');
    if (!logsTableBody) return;

    let url = '/api/system-logs';
    const params = new URLSearchParams();
    if (eventType) params.append('eventType', eventType);
    if (date) params.append('date', date);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const res = await fetch(url);
        const logs = await res.json();

        if (logs.length === 0) {
            logsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No logs found.</td></tr>';
            return;
        }

        logsTableBody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp._seconds * 1000).toLocaleString()}</td>
                <td>${log.action}</td>
                <td>${log.userEmail || 'System'}</td>
                <td>${log.details}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading system logs:', err);
        logsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading logs.</td></tr>';
    }
}
