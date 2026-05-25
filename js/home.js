function updateGreeting() {
    const user = getCurrentUser();
    if (!user) return;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : (hour < 20 ? 'Buenas tardes' : 'Buenas noches');
    const greetSpan = document.getElementById('greeting');
    if (greetSpan) greetSpan.innerText = `${greeting}, ${user.username}`;
}

function getDayHours(dayId, dayIndex, settings) {
    const dayConfig = settings[dayId];
    if (dayConfig && dayConfig.isVacation) return 8;
    if (dayConfig && dayConfig.isTelework) return dayIndex === 4 ? 8 : 9;
    if (dayConfig && dayConfig.customHours) return dayConfig.customHours;
    return 8;
}

function calculateTotalWeekHours(workSettings) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let total = 0;
    days.forEach((day, idx) => { total += getDayHours(day, idx, workSettings || {}); });
    return total;
}

function calculateExitTime(workSettings) {
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[now.getDay() - 1];
    if (!today || now.getDay() === 6 || now.getDay() === 0) return 'Fin de semana';
    
    const dayIndex = dayNames.indexOf(today);
    const startTime = (workSettings?.globalStartTime) || '08:30';
    const [startHour, startMin] = startTime.split(':').map(Number);
    
    let workHours = getDayHours(today, dayIndex, workSettings || {});
    const dayConfig = workSettings?.[today];
    if (dayConfig && dayConfig.isVacation) return 'Vacaciones';
    
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
    const weeklyTotal = calculateTotalWeekHours(workSettings);
    const remaining = Math.max(0, 40 - weeklyTotal);
    const percent = Math.min(100, (weeklyTotal / 40) * 100);
    
    const weeklyHoursSpan = document.getElementById('weeklyHours');
    const remainingSpan = document.getElementById('remainingWeekly');
    const progressFill = document.getElementById('weeklyProgress');
    const exitTimeSpan = document.getElementById('exitTimeToday');
    
    if (weeklyHoursSpan) weeklyHoursSpan.innerText = weeklyTotal.toFixed(1);
    if (remainingSpan) remainingSpan.innerText = remaining.toFixed(1);
    if (progressFill) progressFill.style.width = percent + '%';
    if (exitTimeSpan) exitTimeSpan.innerText = calculateExitTime(workSettings);
}

function updatePreviews() {
    const userData = getUserData();
    if (!userData) return;
    
    const shoppingPreview = document.getElementById('shoppingPreview');
    if (shoppingPreview) {
        const items = userData.shopping || [];
        if (items.length === 0) shoppingPreview.innerHTML = '<li><i class="fas fa-plus-circle"></i> Añade items con doble clic</li>';
        else shoppingPreview.innerHTML = items.slice(0, 3).map(item => `<li><i class="fas fa-circle"></i> ${escapeHtml(item.name)}${item.completed ? ' ✓' : ''}</li>`).join('');
    }
    
    const booksPreview = document.getElementById('booksPreview');
    if (booksPreview) {
        const books = userData.books || [];
        if (books.length === 0) booksPreview.innerHTML = '<li><i class="fas fa-book-open"></i> Añade libros leídos</li>';
        else booksPreview.innerHTML = books.slice(0, 3).map(book => `<li><i class="fas fa-check-circle"></i> ${escapeHtml(book.title)}</li>`).join('');
    }
    
    const seriesPreview = document.getElementById('seriesPreview');
    if (seriesPreview) {
        const pending = userData.series?.pending || [];
        const watched = userData.series?.watched || [];
        if (pending.length === 0 && watched.length === 0) seriesPreview.innerHTML = '<li><i class="fas fa-tv"></i> Añade series</li>';
        else seriesPreview.innerHTML = `<li><i class="fas fa-clock"></i> Pendientes: ${pending.length}</li><li><i class="fas fa-check-double"></i> Vistas: ${watched.length}</li>`;
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
    setInterval(updateHomeStats, 60000);
});