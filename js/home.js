function updateGreeting() {
    const user = getCurrentUser();
    if (!user) return;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : (hour < 20 ? 'Buenas tardes' : 'Buenas noches');
    const greetSpan = document.getElementById('greeting');
    if (greetSpan) greetSpan.innerText = `${greeting}, ${user.username}`;
}

function calculateTodayHoursReal() {
    const userData = getUserData();
    if (!userData) return 0;
    const settings = userData.workSettings || {};
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[now.getDay() - 1];
    if (!today || now.getDay() === 6 || now.getDay() === 0) return 0;
    
    const dayIndex = dayNames.indexOf(today);
    const dayConfig = settings[today] || {};
    const startTime = dayConfig.customStartTime || settings.globalStartTime || '08:30';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    if (currentHour < startHour || (currentHour === startHour && currentMin < startMin)) return 0;
    
    let workedMinutes = (currentHour - startHour) * 60 + (currentMin - startMin);
    const hasLunch = dayIndex !== 4;
    if (hasLunch && workedMinutes > 30) workedMinutes -= 30;
    
    return Math.max(0, workedMinutes / 60);
}

function calculateAccumulatedWeekHours() {
    const userData = getUserData();
    if (!userData) return 0;
    const settings = userData.workSettings || {};
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let accumulated = 0;
    
    for (let i = 0; i < now.getDay() - 1; i++) {
        const dayId = dayNames[i];
        const dayConfig = settings[dayId] || {};
        if (dayConfig.isVacation) accumulated += 8;
        else if (dayConfig.isTelework) accumulated += i === 4 ? 8 : 9;
        else if (dayConfig.customHours) accumulated += dayConfig.customHours;
        else accumulated += 8;
    }
    accumulated += calculateTodayHoursReal();
    return Math.round(accumulated * 10) / 10;
}

function calculateExitTimeForHome() {
    const userData = getUserData();
    if (!userData) return '--:--';
    const settings = userData.workSettings || {};
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[now.getDay() - 1];
    if (!today || now.getDay() === 6 || now.getDay() === 0) return 'Fin de semana';
    
    const dayIndex = dayNames.indexOf(today);
    const startTime = (settings?.globalStartTime) || '08:30';
    const dayConfig = settings?.[today] || {};
    const actualStartTime = dayConfig.customStartTime || startTime;
    
    let workHours = 8;
    if (dayConfig.isVacation) return 'Vacaciones';
    if (dayConfig.isTelework) workHours = dayIndex === 4 ? 8 : 9;
    if (dayConfig.customHours) workHours = dayConfig.customHours;
    
    const [startHour, startMin] = actualStartTime.split(':').map(Number);
    const hasLunch = dayIndex !== 4;
    let totalMinutes = (startHour * 60 + startMin) + (workHours * 60) + (hasLunch ? 30 : 0);
    const minExitMinutes = 16 * 60 + 30;
    if (totalMinutes < minExitMinutes) totalMinutes = minExitMinutes;
    const exitHour = Math.floor(totalMinutes / 60);
    const exitMin = totalMinutes % 60;
    return `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
}

function updateHomeStats() {
    const userData = getUserData();
    if (!userData) return;
    
    const actualAccumulated = calculateAccumulatedWeekHours();
    const percent = Math.min(100, (actualAccumulated / 40) * 100);
    const todayHours = calculateTodayHoursReal();
    const exitTime = calculateExitTimeForHome();
    
    const weeklyHoursSpan = document.getElementById('weeklyHours');
    const todayHoursSpan = document.getElementById('todayHours');
    const progressFill = document.getElementById('weeklyProgress');
    const exitTimeSpan = document.getElementById('exitTimeToday');
    
    if (weeklyHoursSpan) weeklyHoursSpan.innerText = actualAccumulated.toFixed(1);
    if (todayHoursSpan) todayHoursSpan.innerText = todayHours.toFixed(1);
    if (progressFill) progressFill.style.width = percent + '%';
    if (exitTimeSpan) exitTimeSpan.innerText = exitTime;
    
    const statsBooks = document.getElementById('statsBooks');
    const statsWatched = document.getElementById('statsWatched');
    const statsProductivity = document.getElementById('statsProductivity');
    const statsWorkouts = document.getElementById('statsWorkouts');
    
    if (statsBooks) statsBooks.innerText = (userData.books || []).length;
    if (statsWatched) statsWatched.innerText = (userData.series?.watched || []).length;
    if (statsWorkouts) statsWorkouts.innerText = (userData.workouts || []).length;
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[new Date().getDay() - 1];
    let expectedToday = 8;
    if (today && userData.workSettings?.[today]) {
        const dayConfig = userData.workSettings[today];
        const dayIndex = dayNames.indexOf(today);
        if (dayConfig?.isVacation) expectedToday = 8;
        else if (dayConfig?.isTelework) expectedToday = dayIndex === 4 ? 8 : 9;
        else if (dayConfig?.customHours) expectedToday = dayConfig.customHours;
    }
    const productivity = expectedToday > 0 ? Math.min(100, (todayHours / expectedToday) * 100) : 0;
    if (statsProductivity) statsProductivity.innerText = Math.floor(productivity);
}

async function updatePreviews() {
    const userData = getUserData();
    if (!userData) return;
    
    // Libros preview
    const booksPreview = document.getElementById('booksPreview');
    if (booksPreview) {
        const books = userData.books || [];
        if (books.length === 0) {
            booksPreview.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fas fa-book-open"></i><br>No hay libros</div>';
        } else {
            const previewItems = await Promise.all(books.slice(0, 3).map(async (book) => {
                let coverUrl = '';
                try {
                    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(book.title)}&limit=1`);
                    const data = await response.json();
                    if (data.docs && data.docs[0] && data.docs[0].cover_i) {
                        coverUrl = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-M.jpg`;
                    }
                } catch(e) { console.log('Error fetching cover:', e); }
                return `<div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 16px; margin: 0 5px;">
                            ${coverUrl ? `<img src="${coverUrl}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 12px;" onerror="this.src=''">` : '<i class="fas fa-book" style="font-size: 3rem; color: var(--accent);"></i>'}
                            <div style="font-size: 0.7rem; margin-top: 5px;">${escapeHtml(book.title.substring(0, 20))}</div>
                        </div>`;
            }));
            booksPreview.innerHTML = `<div style="display: flex; gap: 10px;">${previewItems.join('')}</div>`;
        }
    }
    
    // Series preview
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
                } catch(e) { console.log('Error fetching poster:', e); }
                return `<div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 16px; margin: 0 5px;">
                            ${posterUrl ? `<img src="${posterUrl}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 12px;" onerror="this.src=''">` : '<i class="fas fa-tv" style="font-size: 3rem; color: var(--accent);"></i>'}
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
    
    // Deporte preview - últimos 3 entrenamientos
    const sportsPreview = document.getElementById('sportsPreview');
    if (sportsPreview) {
        const workouts = userData.workouts || [];
        if (workouts.length === 0) {
            sportsPreview.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-dumbbell"></i><br>Sin entrenamientos</div>';
        } else {
            sportsPreview.innerHTML = workouts.slice(0, 3).map(w => `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 8px;">
                    <i class="fas fa-dumbbell" style="color: var(--accent);"></i>
                    <div style="flex: 1;">
                        <strong>${escapeHtml(w.name)}</strong>
                        <small style="display: block;">${w.weight}kg · ${w.sets}x${w.reps}</small>
                    </div>
                </div>
            `).join('');
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