let statsAccumulated = 0;
let statsRemaining = 0;

function updateStatsFromCalculator(accumulated, remaining, percent) {
    statsAccumulated = accumulated;
    statsRemaining = remaining;
    const workWeekly = document.getElementById('workWeekly');
    const workRemaining = document.getElementById('workRemaining');
    const workProgress = document.getElementById('workProgress');
    if (workWeekly) workWeekly.innerText = accumulated.toFixed(1);
    if (workRemaining) workRemaining.innerText = remaining.toFixed(1);
    if (workProgress) workProgress.style.width = percent + '%';
}

function updateStats() {
    const userData = getUserData();
    if (!userData) return;
    
    const booksRead = userData.books || [];
    const booksToRead = userData.toReadBooks || [];
    const seriesWatched = userData.series?.watched || [];
    const seriesPending = userData.series?.pending || [];
    const shoppingItems = userData.shopping || [];
    const shoppingCompleted = shoppingItems.filter(i => i.completed).length;
    const shoppingPending = shoppingItems.filter(i => !i.completed).length;
    const workouts = userData.workouts || [];
    const muscleStatus = userData.muscleStatus || {};
    
    const todayHours = typeof calculateTodayHours === 'function' ? calculateTodayHours() : 0;
    
    // Calcular fatiga media
    let totalFatigue = 0;
    let muscleCount = 0;
    for (let m in muscleStatus) {
        totalFatigue += muscleStatus[m]?.fatigue || 0;
        muscleCount++;
    }
    const avgFatigue = muscleCount > 0 ? Math.round(totalFatigue / muscleCount) : 0;
    
    // Global stats
    const globalBooks = document.getElementById('globalBooks');
    const globalSeries = document.getElementById('globalSeries');
    const globalPending = document.getElementById('globalPending');
    const globalShopping = document.getElementById('globalShopping');
    const globalWorkouts = document.getElementById('globalWorkouts');
    const globalFatigue = document.getElementById('globalFatigue');
    
    if (globalBooks) globalBooks.innerText = booksRead.length;
    if (globalSeries) globalSeries.innerText = seriesWatched.length;
    if (globalPending) globalPending.innerText = booksToRead.length + seriesPending.length;
    if (globalShopping) globalShopping.innerText = shoppingPending;
    if (globalWorkouts) globalWorkouts.innerText = workouts.length;
    if (globalFatigue) globalFatigue.innerText = avgFatigue;
    
    // Work stats
    const workToday = document.getElementById('workToday');
    if (workToday) workToday.innerText = todayHours.toFixed(1);
    
    // Detail stats
    const detailBooksRead = document.getElementById('detailBooksRead');
    const detailBooksToRead = document.getElementById('detailBooksToRead');
    const detailBooksTotal = document.getElementById('detailBooksTotal');
    const detailSeriesWatched = document.getElementById('detailSeriesWatched');
    const detailSeriesPending = document.getElementById('detailSeriesPending');
    const detailSeriesTotal = document.getElementById('detailSeriesTotal');
    const detailShoppingPending = document.getElementById('detailShoppingPending');
    const detailShoppingCompleted = document.getElementById('detailShoppingCompleted');
    const detailWorkouts = document.getElementById('detailWorkouts');
    
    if (detailBooksRead) detailBooksRead.innerText = booksRead.length;
    if (detailBooksToRead) detailBooksToRead.innerText = booksToRead.length;
    if (detailBooksTotal) detailBooksTotal.innerText = booksRead.length + booksToRead.length;
    if (detailSeriesWatched) detailSeriesWatched.innerText = seriesWatched.length;
    if (detailSeriesPending) detailSeriesPending.innerText = seriesPending.length;
    if (detailSeriesTotal) detailSeriesTotal.innerText = seriesWatched.length + seriesPending.length;
    if (detailShoppingPending) detailShoppingPending.innerText = shoppingPending;
    if (detailShoppingCompleted) detailShoppingCompleted.innerText = shoppingCompleted;
    if (detailWorkouts) detailWorkouts.innerText = workouts.length;
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

window.updateStatsFromCalculator = updateStatsFromCalculator;
window.updateStats = updateStats;