document.addEventListener('app-initialized', () => {
    if (document.body.id === 'training-data-page') {
        // Initial data load
        loadTrainingDataStats();
        loadTrainingDataImages();

        // Listen for real-time updates
        document.addEventListener('training-data-stats-update', e => updateTrainingDataStats(e.detail));
        document.addEventListener('new-training-image-received', e => addImageToGallery(e.detail));
    }
});

// --- UI UPDATE FUNCTIONS ---

function updateTrainingDataStats(stats) {
    document.getElementById('total-training-images').innerText = stats.totalTrainingImages || 0;
    document.getElementById('eye-image-count').innerText = stats.eyeImageCount || 0;
    document.getElementById('gill-image-count').innerText = stats.gillImageCount || 0;
    document.getElementById('full-fish-image-count').innerText = stats.fullFishImageCount || 0;
}

function renderImageCard(item) {
    return `
        <div class="col-lg-2 col-md-3 col-sm-4 mb-3" data-image-id="${item.id}">
            <div class="card h-100">
                <img src="${item.imageUrl || 'https://via.placeholder.com/150'}" class="card-img-top" style="height: 150px; object-fit: cover;" onerror="this.style.display='none'">
                <div class="card-footer">
                    <small class="text-muted">${item.species || 'N/A'} - ${item.freshness || 'N/A'}</small>
                </div>
            </div>
        </div>
    `;
}

function addImageToGallery(image) {
    const gallery = document.getElementById('training-data-container');
    if (gallery) {
        // Remove placeholder if it exists
        const placeholder = gallery.querySelector('.placeholder-message');
        if (placeholder) placeholder.remove();

        const newCard = renderImageCard(image);
        gallery.insertAdjacentHTML('afterbegin', newCard);
    }
}

// --- API FETCH FUNCTIONS ---

async function loadTrainingDataStats() {
    try {
        const res = await fetch('/api/training-data-stats');
        if (res.ok) updateTrainingDataStats(await res.json());
    } catch (error) {
        console.error('Failed to load training data stats:', error);
    }
}

async function loadTrainingDataImages() {
    const gallery = document.getElementById('training-data-container');
    if (!gallery) return;

    try {
        const res = await fetch('/api/training-data');
        if (res.ok) {
            const images = await res.json();
            if (images.length === 0) {
                gallery.innerHTML = '<p class="text-center placeholder-message">No training images found.</p>';
                return;
            }
            gallery.innerHTML = images.map(renderImageCard).join('');
        }
    } catch (error) {
        console.error('Failed to load training images:', error);
        gallery.innerHTML = '<p class="text-center text-danger">Error loading images.</p>';
    }
}
