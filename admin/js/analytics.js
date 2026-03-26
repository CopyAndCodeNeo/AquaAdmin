let dailyScanChart, freshnessChart, speciesChart, datasetGrowthChart;

document.addEventListener('app-initialized', () => {
    if (document.body.id === 'analytics-page') {
        // Initial data load
        loadAnalytics();
        loadAndRenderDatasetGrowthChart();

        // Listen for real-time updates
        document.addEventListener('new-scan-received', e => updateDatasetGrowthChart(e.detail));

        // Date range filter
        const dateRangeForm = document.getElementById('date-range-form');
        dateRangeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loadAnalytics();
        });
    }
});

async function loadAnalytics() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    let url = '/api/analytics';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const res = await fetch(url);
        const scans = await res.json();

        if (scans.length === 0) {
            document.getElementById('charts-container').innerHTML = '<p class="text-center">No data available for the selected range.</p>';
            return;
        }

        renderDailyScanChart(scans);
        renderFreshnessChart(scans);
        renderSpeciesChart(scans);
    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}

async function loadAndRenderDatasetGrowthChart() {
    try {
        const res = await fetch('/api/dataset-growth');
        if (!res.ok) return;
        const growthData = await res.json();
        renderDatasetGrowthChart(growthData);
    } catch (err) {
        console.error('Error loading dataset growth data:', err);
    }
}

function updateDatasetGrowthChart(newScan) {
    if (!datasetGrowthChart) return;

    const lastDataPoint = datasetGrowthChart.data.datasets[0].data.slice(-1)[0];
    const newPoint = {
        x: new Date(newScan.uploadDate._seconds * 1000),
        y: (lastDataPoint ? lastDataPoint.y : 0) + 1
    };

    datasetGrowthChart.data.datasets[0].data.push(newPoint);
    datasetGrowthChart.update();
}

function renderDatasetGrowthChart(growthData) {
    const ctx = document.getElementById('dataset-growth-chart').getContext('2d');
    if (datasetGrowthChart) datasetGrowthChart.destroy();

    datasetGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Total Dataset Images Over Time',
                data: growthData.map(d => ({ x: new Date(d.date), y: d.count })),
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' }
                }
            }
        }
    });
}

function renderDailyScanChart(scans) {
    const dailyCounts = scans.reduce((acc, scan) => {
        const date = new Date(scan.uploadDate._seconds * 1000).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});

    const ctx = document.getElementById('daily-scan-chart').getContext('2d');
    if (dailyScanChart) dailyScanChart.destroy();
    dailyScanChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(dailyCounts),
            datasets: [{ label: 'Scans per Day', data: Object.values(dailyCounts), borderColor: 'rgba(75, 192, 192, 1)', tension: 0.1 }]
        }
    });
}

function renderFreshnessChart(scans) {
    const freshnessCounts = scans.reduce((acc, scan) => {
        const freshness = scan.freshness || 'unknown';
        acc[freshness] = (acc[freshness] || 0) + 1;
        return acc;
    }, {});

    const ctx = document.getElementById('freshness-chart').getContext('2d');
    if (freshnessChart) freshnessChart.destroy();
    freshnessChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(freshnessCounts),
            datasets: [{ data: Object.values(freshnessCounts), backgroundColor: ['#28a745', '#dc3545', '#6c757d'] }]
        }
    });
}

function renderSpeciesChart(scans) {
    const speciesCounts = scans.reduce((acc, scan) => {
        const species = scan.species || 'unknown';
        acc[species] = (acc[species] || 0) + 1;
        return acc;
    }, {});

    const ctx = document.getElementById('species-chart').getContext('2d');
    if (speciesChart) speciesChart.destroy();
    speciesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(speciesCounts),
            datasets: [{ label: 'Scans per Species', data: Object.values(speciesCounts), backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
        }
    });
}
