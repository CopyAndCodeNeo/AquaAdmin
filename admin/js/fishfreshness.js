let freshnessDistributionChart;

document.addEventListener('app-initialized', () => {
    if (document.body.id === 'fishfreshness-page') {
        loadFreshnessData();
    }
});

async function loadFreshnessData() {
    try {
        // Fetch summary data
        const summaryRes = await fetch('/api/fishfreshness');
        const summaryData = await summaryRes.json();
        document.getElementById('total-fresh').innerText = summaryData.freshCount || 0;
        document.getElementById('total-not-fresh').innerText = summaryData.notFreshCount || 0;

        // Render chart
        const ctx = document.getElementById('freshness-distribution-chart').getContext('2d');
        if (freshnessDistributionChart) {
            freshnessDistributionChart.destroy();
        }
        freshnessDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Fresh', 'Not Fresh'],
                datasets: [{
                    label: 'Freshness Distribution',
                    data: [summaryData.freshCount, summaryData.notFreshCount],
                    backgroundColor: ['#28a745', '#dc3545'],
                }]
            }
        });

        // Fetch recent checks for the table
        const scansRes = await fetch('/api/scans?limit=10&sortOrder=desc&freshness=fresh,not_fresh');
        const { scans } = await scansRes.json();
        const tableBody = document.getElementById('recent-checks-table-body');

        if (!scans || scans.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No freshness checks found.</td></tr>';
            return;
        }

        tableBody.innerHTML = scans.map(scan => {
            const uploadDate = scan.uploadDate ? new Date(scan.uploadDate._seconds * 1000).toLocaleString() : 'N/A';
            return `
                <tr>
                    <td>${scan.id}</td>
                    <td>${scan.userName || 'Unknown'}</td>
                    <td>${scan.species || 'N/A'}</td>
                    <td>${scan.freshness}</td>
                    <td>${scan.confidence ? (scan.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                    <td>${uploadDate}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading freshness data:', err);
    }
}
