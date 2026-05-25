const TMDB_API_KEY = 'd9940498503065e949b5ee26c152eaa1';
let searchType = 'tv';
let pendingSeries = [];
let watchedSeries = [];

function loadSeries() {
    const userData = getUserData();
    if (userData && userData.series) {
        pendingSeries = userData.series.pending || [];
        watchedSeries = userData.series.watched || [];
    } else {
        pendingSeries = [];
        watchedSeries = [];
    }
    renderSeries();
}

function saveSeries() {
    const userData = getUserData();
    if (userData) {
        if (!userData.series) userData.series = { pending: [], watched: [] };
        userData.series.pending = pendingSeries;
        userData.series.watched = watchedSeries;
        saveUserData(userData);
    }
}

async function searchSeries() {
    const query = document.getElementById('searchSeriesInput').value.trim();
    if (!query) return;
    const resultsDiv = document.getElementById('seriesSearchResults');
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Buscando...</div>';
    
    try {
        let results = [];
        if (searchType === 'tv') {
            const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=es`;
            const response = await fetch(url);
            const data = await response.json();
            results = data.results || [];
        } else {
            const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&sfw=true&limit=10`;
            const response = await fetch(url);
            const data = await response.json();
            results = data.data || [];
        }
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">No se encontraron resultados</div>';
            return;
        }
        
        if (searchType === 'tv') {
            resultsDiv.innerHTML = results.map(show => {
                const title = show.name || 'Sin título';
                const year = show.first_air_date ? show.first_air_date.substring(0, 4) : '?';
                const overview = show.overview ? show.overview.substring(0, 120) + '...' : 'Sin descripción';
                const poster = show.poster_path ? `https://image.tmdb.org/t/p/w200${show.poster_path}` : '';
                return `
                    <div class="result-item">
                        ${poster ? `<img src="${poster}" onerror="this.style.display='none'">` : '<div style="width:60px;height:80px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center"><i class="fas fa-tv"></i></div>'}
                        <div class="result-info">
                            <strong>${escapeHtml(title)}</strong> <small>(${year})</small>
                            <p>${escapeHtml(overview)}</p>
                            <div class="result-actions">
                                <button onclick="addPending('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-secondary">⏰ Pendiente</button>
                                <button onclick="addWatched('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-primary">✅ Vista</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            resultsDiv.innerHTML = results.map(anime => {
                const title = anime.title || 'Sin título';
                const year = anime.year || '?';
                const synopsis = anime.synopsis ? anime.synopsis.substring(0, 120) + '...' : 'Sin descripción';
                const image = anime.images?.jpg?.image_url || '';
                return `
                    <div class="result-item">
                        ${image ? `<img src="${image}" onerror="this.style.display='none'">` : '<div style="width:60px;height:80px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center"><i class="fas fa-film"></i></div>'}
                        <div class="result-info">
                            <strong>${escapeHtml(title)}</strong> <small>(${year})</small>
                            <p>${escapeHtml(synopsis)}</p>
                            <div class="result-actions">
                                <button onclick="addPending('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-secondary">⏰ Pendiente</button>
                                <button onclick="addWatched('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-primary">✅ Vista</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error al buscar</div>';
    }
}

function addPending(title, year) {
    pendingSeries.unshift({ title, year, date: new Date().toISOString() });
    saveSeries();
    renderSeries();
    showToast('Añadido a pendientes');
}

function addWatched(title, year) {
    watchedSeries.unshift({ title, year, date: new Date().toISOString() });
    saveSeries();
    renderSeries();
    showToast('Añadido a vistas');
}

function markAsWatched(index) {
    const series = pendingSeries[index];
    if (series) {
        pendingSeries.splice(index, 1);
        watchedSeries.unshift(series);
        saveSeries();
        renderSeries();
    }
}

function deletePending(index) {
    pendingSeries.splice(index, 1);
    saveSeries();
    renderSeries();
}

function deleteWatched(index) {
    watchedSeries.splice(index, 1);
    saveSeries();
    renderSeries();
}

function renderSeries() {
    const pendingContainer = document.getElementById('pendingSeriesList');
    const watchedContainer = document.getElementById('watchedSeriesList');
    
    if (pendingContainer) {
        if (pendingSeries.length === 0) {
            pendingContainer.innerHTML = '<li style="text-align: center; padding: 20px;">No hay series pendientes</li>';
        } else {
            pendingContainer.innerHTML = pendingSeries.map((s, i) => `
                <li>
                    <div class="item-info"><i class="fas fa-clock" style="color: var(--warning);"></i><span><strong>${escapeHtml(s.title)}</strong> (${s.year})</span></div>
                    <div class="item-actions">
                        <button onclick="markAsWatched(${i})" class="btn-secondary"><i class="fas fa-check"></i></button>
                        <button onclick="deletePending(${i})" class="btn-danger"><i class="fas fa-trash"></i></button>
                    </div>
                </li>
            `).join('');
        }
    }
    
    if (watchedContainer) {
        if (watchedSeries.length === 0) {
            watchedContainer.innerHTML = '<li style="text-align: center; padding: 20px;">No hay series vistas</li>';
        } else {
            watchedContainer.innerHTML = watchedSeries.map((s, i) => `
                <li>
                    <div class="item-info"><i class="fas fa-check-circle" style="color: var(--success);"></i><span><strong>${escapeHtml(s.title)}</strong> (${s.year})</span></div>
                    <div class="item-actions">
                        <button onclick="deleteWatched(${i})" class="btn-danger"><i class="fas fa-trash"></i></button>
                    </div>
                </li>
            `).join('');
        }
    }
}

function initTabs() {
    const tvTab = document.getElementById('searchTvTab');
    const animeTab = document.getElementById('searchAnimeTab');
    if (tvTab) tvTab.onclick = () => { searchType = 'tv'; updateSearchTabs(); };
    if (animeTab) animeTab.onclick = () => { searchType = 'anime'; updateSearchTabs(); };
    updateSearchTabs();
}

function updateSearchTabs() {
    const tvTab = document.getElementById('searchTvTab');
    const animeTab = document.getElementById('searchAnimeTab');
    if (tvTab) tvTab.style.background = searchType === 'tv' ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
    if (animeTab) animeTab.style.background = searchType === 'anime' ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'series' && currentPage === 'series.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    loadSeries();
    initTabs();
    initDockActive();
    document.getElementById('searchSeriesBtn')?.addEventListener('click', searchSeries);
    document.getElementById('searchSeriesInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchSeries(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.addPending = addPending;
window.addWatched = addWatched;
window.markAsWatched = markAsWatched;
window.deletePending = deletePending;
window.deleteWatched = deleteWatched;