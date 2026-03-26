document.addEventListener('app-initialized', () => {
    if (document.body.id === 'dataset-page') {
        const filterForm = document.getElementById('dataset-filter-form');
        
        loadDataset();

        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loadDataset();
        });
    }
});

async function loadDataset(page = 1) {
    const gallery = document.getElementById('image-gallery');
    const paginationControls = document.getElementById('pagination-controls');
    if (!gallery) return;

    const speciesFilter = document.getElementById('species-filter').value;
    const freshnessFilter = document.getElementById('freshness-filter').value;
    const dateFilter = document.getElementById('date-filter').value;

    let url = `/api/dataset?page=${page}&limit=12`;
    if (speciesFilter) url += `&species=${speciesFilter}`;
    if (freshnessFilter) url += `&freshness=${freshnessFilter}`;
    if (dateFilter) url += `&date=${dateFilter}`;

    try {
        const res = await fetch(url);
        const { images, total, pages } = await res.json();

        if (images.length === 0) {
            gallery.innerHTML = `<p class="text-center">No images found.</p>`;
            paginationControls.innerHTML = '';
            return;
        }

        gallery.innerHTML = images.map(image => {
            const uploadDate = image.uploadDate ? new Date(image.uploadDate._seconds * 1000).toLocaleDateString() : 'N/A';
            return `
                <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                    <div class="card h-100">
                        <img src="${image.imageUrl || 'https://via.placeholder.com/300'}" class="card-img-top" alt="${image.species || 'Fish'}" style="height: 200px; object-fit: cover;" onerror="this.style.display='none'">
                        <div class="card-body">
                            <h6 class="card-title">${image.species || 'Unknown Species'}</h6>
                            <p class="card-text mb-1"><strong>Freshness:</strong> ${image.freshness || 'N/A'}</p>
                            <p class="card-text mb-1"><strong>User:</strong> ${image.userName || 'Unknown'}</p>
                            <small class="text-muted">Uploaded: ${uploadDate}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Render pagination
        let paginationHTML = '<ul class="pagination justify-content-center">';
        for (let i = 1; i <= pages; i++) {
            paginationHTML += `<li class="page-item ${i === page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        paginationHTML += '</ul>';
        paginationControls.innerHTML = paginationHTML;

        // Add event listeners to pagination links
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const newPage = parseInt(e.target.dataset.page);
                loadDataset(newPage);
            });
        });

    } catch (err) {
        console.error('Error loading dataset:', err);
        gallery.innerHTML = `<p class="text-center text-danger">Error loading dataset.</p>`;
    }
}
