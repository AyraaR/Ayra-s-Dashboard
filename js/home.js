function updateGreeting() {
    const user = getCurrentUser();
    if (!user) return;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : (hour < 20 ? 'Buenas tardes' : 'Buenas noches');
    const greetSpan = document.getElementById('greeting');
    if (greetSpan) greetSpan.innerText = `${greeting}, ${user.username}`;
}

function getDayHoursForHome(dayId, dayIndex, settings) {
    const dayConfig = settings[dayId];
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return dayIndex === 4 ? 8 : 9;
    if (dayConfig?.customHours) return dayConfig.customHours;
    return 8;
}

function calculateTotalWeekHoursForHome(workSettings) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let total = 0;
    days.forEach((day, idx) => { total += getDayHoursForHome(day, idx, workSettings || {}); });
    return total;
}

function calculateExitTimeForHome(workSettings) {
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[now.getDay() - 1];
    if (!today || now.getDay() === 6 || now.getDay() === 0) return 'Fin de semana';
    
    const dayIndex = dayNames.indexOf(today);
    const startTime = (workSettings?.globalStartTime) || '08:30';
    const dayConfig = workSettings?.[today] || {};
    const actualStartTime = dayConfig.customStartTime || startTime;
    
    let workHours = getDayHoursForHome(today, dayIndex, workSettings || {});
    if (dayConfig?.isVacation) return 'Vacaciones';
    
    const [startHour, startMin] = actualStartTime.split(':').map(Number);
    const hasLunch = dayIndex !== 4;
    const totalMinutes = (startHour * 60 + startMin) + (workHours * 60) + (hasLunch ? 30 : 0);
    const exitHour = Math.floor(totalMinutes / 60);
    const exitMin = totalMinutes % 60;
    return `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
}

function updateHomeStats() {
    const userData = getUserData();
    if (!userData) return;
    
    const workSettings = userData.workSettings || {};
    const plannedTotal = calculateTotalWeekHoursForHome(workSettings);
    const percent = Math.min(100, (plannedTotal / 40) * 100);
    const todayHours = typeof calculateTodayHours === 'function' ? calculateTodayHours() : 0;
    const actualAccumulated = typeof calculateActualAccumulatedHours === 'function' ? calculateActualAccumulatedHours() : 0;
    
    // Calcular horas esperadas para hoy
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[now.getDay() - 1];
    let expectedToday = 8;
    if (today && workSettings[today]) {
        const dayConfig = workSettings[today];
        const dayIndex = dayNames.indexOf(today);
        if (dayConfig?.isVacation) expectedToday = 8;
        else if (dayConfig?.isTelework) expectedToday = dayIndex === 4 ? 8 : 9;
        else if (dayConfig?.customHours) expectedToday = dayConfig.customHours;
    }
    
    // Productividad = horas reales / horas esperadas del día
    const productivity = expectedToday > 0 ? Math.min(100, (todayHours / expectedToday) * 100) : 0;
    
    const weeklyHoursSpan = document.getElementById('weeklyHours');
    const todayHoursSpan = document.getElementById('todayHours');
    const progressFill = document.getElementById('weeklyProgress');
    const exitTimeSpan = document.getElementById('exitTimeToday');
    const statsProductivity = document.getElementById('statsProductivity');
    
    if (weeklyHoursSpan) weeklyHoursSpan.innerText = actualAccumulated.toFixed(1);
    if (todayHoursSpan) todayHoursSpan.innerText = todayHours.toFixed(1);
    if (progressFill) progressFill.style.width = percent + '%';
    if (exitTimeSpan) exitTimeSpan.innerText = calculateExitTimeForHome(workSettings);
    if (statsProductivity) statsProductivity.innerText = Math.floor(productivity);
    
    const statsBooks = document.getElementById('statsBooks');
    const statsWatched = document.getElementById('statsWatched');
    if (statsBooks) statsBooks.innerText = (userData.books || []).length;
    if (statsWatched) statsWatched.innerText = (userData.series?.watched || []).length;
}

async function updatePreviews() {
    const userData = getUserData();
    if (!userData) return;
    
    // Libros preview - SOLO 3 items, ocupando todo el ancho
    const booksPreview = document.getElementById('booksPreview');
    if (booksPreview) {
        const books = userData.books || [];
        if (books.length === 0) {
            booksPreview.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fas fa-book-open"></i><br>No hay libros</div>';
        } else {
            const previewItems = await Promise.all(books.slice(0, 3).map(async (book) => {
                let coverUrl = '';
                try {
                    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(book.title)}&limit=1`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.docs && data.docs[0] && data.docs[0].cover_i) {
                        coverUrl = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-M.jpg`;
                    }
                } catch(e) {}
                
                return `<div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 16px; margin: 0 5px;">
                            ${coverUrl ? `<img src="${coverUrl}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 12px;">` : '<i class="fas fa-book" style="font-size: 3rem; color: var(--accent);"></i>'}
                            <div style="font-size: 0.7rem; margin-top: 5px;">${escapeHtml(book.title.substring(0, 20))}</div>
                        </div>`;
            }));
            booksPreview.innerHTML = `<div style="display: flex; gap: 10px;">${previewItems.join('')}</div>`;
        }
    }
    
    // Series preview - SOLO 3 items
    const seriesPreview = document.getElementById('seriesPreview');
    if (seriesPreview) {
        const watched = userData.series?.watched || [];
        if (watched.length === 0) {
            seriesPreview.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fas fa-tv"></i><br>No hay series</div>';
        } else {
            const previewItems = await Promise.all(watched.slice(0, 3).map(async (series) => {
                let posterUrl = '';
                try {
                    const response = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=d9940498503065e949b5ee26c152eaa1&query=${encodeURIComponent(series.title)}`);
                    const data = await response.json();
                    if (data.results && data.results[0]?.poster_path) {
                        posterUrl = `https://image.tmdb.org/t/p/w185${data.results[0].poster_path}`;
                    }
                } catch(e) {}
                
                return `<div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 16px; margin: 0 5px;">
                            ${posterUrl ? `<img src="${posterUrl}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 12px;">` : '<i class="fas fa-tv" style="font-size: 3rem; color: var(--accent);"></i>'}
                            <div style="font-size: 0.7rem; margin-top: 5px;">${escapeHtml(series.title.substring(0, 20))}</div>
                        </div>`;
            }));
            seriesPreview.innerHTML = `<div style="display: flex; gap: 10px;">${previewItems.join('')}</div>`;
        }
    }
    
    // Shopping preview
    const shoppingPreview = document.getElementById('shoppingPreview');
    if (shoppingPreview) {
        const items = userData.shopping || [];
        if (items.length === 0) {
            shoppingPreview.innerHTML = '<li style="text-align: center; padding: 20px;"><i class="fas fa-plus-circle"></i> Añade items</li>';
        } else {
            shoppingPreview.innerHTML = items.slice(0, 5).map(item => `<li><i class="fas ${item.completed ? 'fa-check-circle' : 'fa-circle'}" style="color: ${item.completed ? 'var(--success)' : 'var(--accent)'}"></i> ${escapeHtml(item.name)}</li>`).join('');
        }
    }
}

function initWidgetDoubleClick() {
    document.querySelectorAll('.widget').forEach(widget => {
        widget.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const page = widget.getAttribute('data-page');
            if (page && page !== '#') window.location.href = page;
        });
    });
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'home' && currentPage === 'home.html') item.classList.add('active');
        if (page === 'calculator' && currentPage === 'calculator.html') item.classList.add('active');
        if (page === 'shopping' && currentPage === 'shopping.html') item.classList.add('active');
        if (page === 'books' && currentPage === 'books.html') item.classList.add('active');
        if (page === 'series' && currentPage === 'series.html') item.classList.add('active');
        if (page === 'stats' && currentPage === 'stats.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    updateGreeting();
    updateHomeStats();
    updatePreviews();
    initWidgetDoubleClick();
    initDockActive();
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
    setInterval(() => { updateHomeStats(); }, 60000);
});
