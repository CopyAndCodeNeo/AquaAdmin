document.addEventListener('app-initialized', () => {
    if (document.body.id === 'scans-page') {
        const filterForm = document.getElementById('filter-form');
        
        loadScans();

        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loadScans();
        });
    }
});

async function loadScans(page = 1) {
    const scanTableBody = document.getElementById('scan-records-table-body');
    const paginationControls = document.getElementById('pagination-controls');
    if (!scanTableBody) return;

    const userFilter = document.getElementById('user-filter').value;
    const speciesFilter = document.getElementById('species-filter').value;
    const freshnessFilter = document.getElementById('freshness-filter').value;
    const sortOrder = document.getElementById('sort-order').value;

    let url = `/api/scans?page=${page}&limit=10&sortOrder=${sortOrder}`;
    if (userFilter) url += `&user=${userFilter}`;
    if (speciesFilter) url += `&species=${speciesFilter}`;
    if (freshnessFilter) url += `&freshness=${freshnessFilter}`;

    try {
        const res = await fetch(url);
        const { scans, total, pages } = await res.json();

        if (scans.length === 0) {
            scanTableBody.innerHTML = `<tr><td colspan="8" class="text-center">No scans found.</td></tr>`;
            paginationControls.innerHTML = '';
            return;
        }

        scanTableBody.innerHTML = scans.map(scan => {
            const uploadDate = scan.uploadDate ? new Date(scan.uploadDate._seconds * 1000).toLocaleString() : 'N/A';
            return `
                <tr>
                    <td>${scan.id}</td>
                    <td>${scan.userName || "Unknown"}</td>
                    <td>${scan.species || "N/A"}</td>
                    <td>${scan.freshness || "N/A"}</td>
                    <td>${scan.confidence ? (scan.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                    <td>${uploadDate}</td>
                    <td><img src="${scan.imageUrl || ''}" alt="Scan Preview" width="60" style="object-fit: cover; height: 40px;" onerror="this.style.display='none'"></td>
                    <td><span class="badge bg-success">${scan.status || 'Verified'}</span></td>
                </tr>
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
                loadScans(newPage);
            });
        });

    } catch (err) {
        console.error('Error loading scans:', err);
        scanTableBody.innerHTML = `<tr><td colspan="8" class="text-center">Error loading scans.</td></tr>`;
    }
}
