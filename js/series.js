// TMDB API (necesita API key - gratis en themoviedb.org)
// Regístrate en https://www.themoviedb.org/signup y obtén tu API key
const TMDB_API_KEY = 'TU_API_KEY_AQUI'; // <--- REEMPLAZA CON TU API KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w200';

// Jikan API (no necesita API key)
const JIKAN_API_URL = 'https://api.jikan.moe/v4';

let seriesData = { pending: [], watched: [] };
let searchType = 'tv'; // 'tv' o 'anime'

function loadSeriesData() {
    const userData = getUserData();
    if (userData && userData.series) {
        seriesData.pending = userData.series.pending || [];
        seriesData.watched = userData.series.watched || [];
    }
    renderSeries();
}

function saveSeriesData() {
    const userData = getUserData();
    if (userData) {
        if (!userData.series) userData.series = { pending: [], watched: [] };
        userData.series.pending = seriesData.pending;
        userData.series.watched = seriesData.watched;
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
            // Búsqueda en TMDB para series normales
            const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=es`;
            const response = await fetch(url);
            const data = await response.json();
            results = data.results || [];
        } else {
            // Búsqueda en Jikan API para anime
            const url = `${JIKAN_API_URL}/anime?q=${encodeURIComponent(query)}&sfw=true&limit=10`;
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
                const year = show.first_air_date ? show.first_air_date.substring(0, 4) : 'Año desconocido';
                const overview = show.overview ? show.overview.substring(0, 150) + '...' : 'Sin descripción';
                const poster = show.poster_path ? TMDB_IMAGE_URL + show.poster_path : '';
                const voteAvg = show.vote_average ? show.vote_average.toFixed(1) : 'N/A';
                
                return `
                    <div style="display: flex; gap: 15px; padding: 15px; border-bottom: 1px solid var(--glass-border);">
                        ${poster ? `<img src="${poster}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 8px;">` : '<div style="width: 60px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-tv" style="font-size: 2rem;"></i></div>'}
                        <div style="flex: 1;">
                            <strong>${escapeHtml(title)}</strong>
                            <small style="color: var(--text-secondary);"> (${year}) ⭐ ${voteAvg}</small><br>
                            <p style="font-size: 0.8rem; margin-top: 5px;">${escapeHtml(overview)}</p>
                            <div style="margin-top: 8px; display: flex; gap: 8px;">
                                <button onclick="addToPending('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-secondary" style="padding: 4px 12px;"><i class="fas fa-clock"></i> Pendiente</button>
                                <button onclick="addToWatched('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-primary" style="padding: 4px 12px;"><i class="fas fa-check"></i> Vista</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Anime results
            resultsDiv.innerHTML = results.map(anime => {
                const title = anime.title || 'Sin título';
                const year = anime.year || 'Año desconocido';
                const episodes = anime.episodes || '?';
                const score = anime.score || 'N/A';
                const synopsis = anime.synopsis ? anime.synopsis.substring(0, 150) + '...' : 'Sin descripción';
                const imageUrl = anime.images?.jpg?.image_url || '';
                
                return `
                    <div style="display: flex; gap: 15px; padding: 15px; border-bottom: 1px solid var(--glass-border);">
                        ${imageUrl ? `<img src="${imageUrl}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 8px;">` : '<div style="width: 60px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-film" style="font-size: 2rem;"></i></div>'}
                        <div style="flex: 1;">
                            <strong>${escapeHtml(title)}</strong>
                            <small style="color: var(--text-secondary);"> (${year}) 📺 ${episodes} eps ⭐ ${score}</small><br>
                            <p style="font-size: 0.8rem; margin-top: 5px;">${escapeHtml(synopsis)}</p>
                            <div style="margin-top: 8px; display: flex; gap: 8px;">
                                <button onclick="addToPending('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-secondary" style="padding: 4px 12px;"><i class="fas fa-clock"></i> Pendiente</button>
                                <button onclick="addToWatched('${escapeHtml(title).replace(/'/g, "\\'")}', '${year}')" class="btn-primary" style="padding: 4px 12px;"><i class="fas fa-check"></i> Vista</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error searching:', error);
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error al buscar. ' + (searchType === 'tv' && TMDB_API_KEY === 'TU_API_KEY_AQUI' ? 'Necesitas una API key de TMDB' : 'Intenta de nuevo') + '</div>';
    }
}

function addToPending(title, year) {
    seriesData.pending.unshift({ title: title, year: year });
    saveSeriesData();
    renderSeries();
    showTemporaryMessage('Añadido a pendientes');
}

function addToWatched(title, year) {
    seriesData.watched.unshift({ title: title, year: year, date: new Date().toISOString() });
    saveSeriesData();
    renderSeries();
    showTemporaryMessage('Añadido a vistas');
}

function markAsWatched(index) {
    const series = seriesData.pending[index];
    if (series) {
        seriesData.pending.splice(index, 1);
        seriesData.watched.unshift({ ...series, date: new Date().toISOString() });
        saveSeriesData();
        renderSeries();
    }
}

function deletePending(index) {
    seriesData.pending.splice(index, 1);
    saveSeriesData();
    renderSeries();
}

function deleteWatched(index) {
    seriesData.watched.splice(index, 1);
    saveSeriesData();
    renderSeries();
}

function renderSeries() {
    const pendingContainer = document.getElementById('pendingSeriesList');
    const watchedContainer = document.getElementById('watchedSeriesList');
    
    if (pendingContainer) {
        if (seriesData.pending.length === 0) {
            pendingContainer.innerHTML = '<li style="text-align: center; padding: 20px;"><i class="fas fa-smile-wink"></i> No hay series pendientes</li>';
        } else {
            pendingContainer.innerHTML = seriesData.pending.map((series, index) => `
                <li>
                    <div class="item-info">
                        <i class="fas fa-clock" style="color: var(--warning);"></i>
                        <span><strong>${escapeHtml(series.title)}</strong> ${series.year ? `(${series.year})` : ''}</span>
                    </div>
                    <div class="item-actions">
                        <button onclick="markAsWatched(${index})" class="btn-secondary" style="padding: 4px 12px;"><i class="fas fa-check"></i></button>
                        <button onclick="deletePending(${index})" class="btn-danger" style="padding: 4px 12px;"><i class="fas fa-trash"></i></button>
                    </div>
                </li>
            `).join('');
        }
    }
    
    if (watchedContainer) {
        if (seriesData.watched.length === 0) {
            watchedContainer.innerHTML = '<li style="text-align: center; padding: 20px;"><i class="fas fa-smile-wink"></i> No hay series vistas</li>';
        } else {
            watchedContainer.innerHTML = seriesData.watched.map((series, index) => `
                <li>
                    <div class="item-info">
                        <i class="fas fa-check-circle" style="color: var(--success);"></i>
                        <span><strong>${escapeHtml(series.title)}</strong> ${series.year ? `(${series.year})` : ''}</span>
                    </div>
                    <div class="item-actions">
                        <button onclick="deleteWatched(${index})" class="btn-danger" style="padding: 4px 12px;"><i class="fas fa-trash"></i></button>
                    </div>
                </li>
            `).join('');
        }
    }
}

function showTemporaryMessage(msg) {
    let msgDiv = document.getElementById('tempMessageSeries');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'tempMessageSeries';
        msgDiv.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: var(--accent); padding: 10px 20px; border-radius: 40px; z-index: 2000;';
        document.body.appendChild(msgDiv);
    }
    msgDiv.innerText = msg;
    msgDiv.style.display = 'block';
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 2000);
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === 'series' && currentPage === 'series.html') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) {
        window.location.href = '../index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) {
        document.getElementById('userName').innerText = user.username;
    }
    
    loadSeriesData();
    initDockActive();
    
    document.getElementById('searchSeriesBtn')?.addEventListener('click', searchSeries);
    document.getElementById('searchSeriesInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchSeries();
    });
    
    document.getElementById('searchSeriesTab')?.addEventListener('click', () => {
        searchType = 'tv';
        document.getElementById('searchSeriesTab').style.background = 'var(--accent)';
        document.getElementById('searchAnimeTab').style.background = 'rgba(255,255,255,0.1)';
        document.getElementById('searchSeriesInput').placeholder = 'Buscar series... Ej: Breaking Bad, WandaVision';
    });
    
    document.getElementById('searchAnimeTab')?.addEventListener('click', () => {
        searchType = 'anime';
        document.getElementById('searchAnimeTab').style.background = 'var(--accent)';
        document.getElementById('searchSeriesTab').style.background = 'rgba(255,255,255,0.1)';
        document.getElementById('searchSeriesInput').placeholder = 'Buscar anime... Ej: Naruto, Attack on Titan';
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.addToPending = addToPending;
window.addToWatched = addToWatched;
window.markAsWatched = markAsWatched;
window.deletePending = deletePending;
window.deleteWatched = deleteWatched;