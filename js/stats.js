function updateStats() {
    const userData = getUserData();
    if (!userData) return;
    
    // Datos
    const booksRead = userData.books || [];
    const booksToRead = userData.toReadBooks || [];
    const seriesWatched = userData.series?.watched || [];
    const seriesPending = userData.series?.pending || [];
    const shoppingItems = userData.shopping || [];
    const shoppingCompleted = shoppingItems.filter(i => i.completed).length;
    const shoppingPending = shoppingItems.filter(i => !i.completed).length;
    
    // Work settings
    const workSettings = userData.workSettings || {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let weeklyTotal = 0;
    days.forEach((day, idx) => {
        const dayConfig = workSettings[day];
        if (dayConfig?.isVacation) weeklyTotal += 8;
        else if (dayConfig?.isTelework) weeklyTotal += idx === 4 ? 8 : 9;
        else if (dayConfig?.customHours) weeklyTotal += dayConfig.customHours;
        else weeklyTotal += 8;
    });
    const remaining = Math.max(0, 40 - weeklyTotal);
    const todayHours = typeof calculateTodayHours === 'function' ? calculateTodayHours() : 0;
    
    // Global stats
    document.getElementById('globalBooks').innerText = booksRead.length;
    document.getElementById('globalSeries').innerText = seriesWatched.length;
    document.getElementById('globalPending').innerText = booksToRead.length + seriesPending.length;
    document.getElementById('globalShopping').innerText = shoppingPending;
    
    // Work stats
    document.getElementById('workWeekly').innerText = weeklyTotal.toFixed(1);
    document.getElementById('workToday').innerText = todayHours.toFixed(1);
    document.getElementById('workRemaining').innerText = remaining.toFixed(1);
    const workProgress = document.getElementById('workProgress');
    if (workProgress) workProgress.style.width = Math.min(100, (weeklyTotal / 40) * 100) + '%';
    
    // Detail stats
    document.getElementById('detailBooksRead').innerText = booksRead.length;
    document.getElementById('detailBooksToRead').innerText = booksToRead.length;
    document.getElementById('detailBooksTotal').innerText = booksRead.length + booksToRead.length;
    document.getElementById('detailSeriesWatched').innerText = seriesWatched.length;
    document.getElementById('detailSeriesPending').innerText = seriesPending.length;
    document.getElementById('detailSeriesTotal').innerText = seriesWatched.length + seriesPending.length;
    document.getElementById('detailShoppingPending').innerText = shoppingPending;
    document.getElementById('detailShoppingCompleted').innerText = shoppingCompleted;
    
    // Weekly distribution
    const distributionDiv = document.getElementById('weeklyDistribution');
    if (distributionDiv) {
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        let html = '';
        days.forEach((day, idx) => {
            let hours = 0;
            const dayConfig = workSettings[day];
            if (dayConfig?.isVacation) hours = 8;
            else if (dayConfig?.isTelework) hours = idx === 4 ? 8 : 9;
            else if (dayConfig?.customHours) hours = dayConfig.customHours;
            else hours = 8;
            html += `<div class="category-item"><strong>${dayNames[idx]}</strong><br>${hours} horas</div>`;
        });
        distributionDiv.innerHTML = html;
    }
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'stats' && currentPage === 'stats.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    updateStats();
    initDockActive();
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});