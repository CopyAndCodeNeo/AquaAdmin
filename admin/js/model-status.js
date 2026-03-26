document.addEventListener('app-initialized', () => {
    if (document.body.id === 'model-status-page') {
        loadModelStatus();
    }
});

async function loadModelStatus() {
    const container = document.getElementById('model-status-container');
    if (!container) return;

    try {
        const res = await fetch('/api/model-status');
        const status = await res.json();

        if (!status) {
            container.innerHTML = '<p class="text-center">No model metrics available.</p>';
            return;
        }

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Model Version
                            <span class="badge bg-primary rounded-pill">${status.modelVersion}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Accuracy
                            <span class="badge bg-secondary rounded-pill">${status.accuracy}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Precision
                            <span class="badge bg-secondary rounded-pill">${status.precision}</span>
                        </li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Recall
                            <span class="badge bg-secondary rounded-pill">${status.recall}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            F1-Score
                            <span class="badge bg-secondary rounded-pill">${status.f1Score}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Last Trained
                            <span class="badge bg-info rounded-pill">${status.lastTrained && status.lastTrained._seconds ? new Date(status.lastTrained._seconds * 1000).toLocaleString() : 'N/A'}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Dataset Size Used
                            <span class="badge bg-info rounded-pill">${status.datasetSize}</span>
                        </li>
                    </ul>
                </div>
            </div>
        `;

    } catch (err) {
        console.error('Error loading model status:', err);
        container.innerHTML = '<p class="text-center text-danger">Error loading model status.</p>';
    }
}
