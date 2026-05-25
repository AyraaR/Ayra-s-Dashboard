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
    
    // Calcular horas REALES acumuladas (no planificadas)
    let accumulatedHours = 0;
    const currentDayIdx = getCurrentDayIndex();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const settings = userData.workSettings || {};
    
    for (let i = 0; i < currentDayIdx; i++) {
        const dayId = dayNames[i];
        const dayConfig = settings[dayId] || {};
        if (dayConfig.isVacation) accumulatedHours += 8;
        else if (dayConfig.isTelework) accumulatedHours += i === 4 ? 8 : 9;
        else if (dayConfig.customHours) accumulatedHours += dayConfig.customHours;
        else accumulatedHours += 8;
    }
    accumulatedHours += calculateTodayHours();
    accumulatedHours = Math.round(accumulatedHours * 10) / 10;
    
    const remaining = Math.max(0, 40 - accumulatedHours);
    const percent = Math.min(100, (accumulatedHours / 40) * 100);
    const todayHours = calculateTodayHours();
    
    // Global stats
    document.getElementById('globalBooks').innerText = booksRead.length;
    document.getElementById('globalSeries').innerText = seriesWatched.length;
    document.getElementById('globalPending').innerText = booksToRead.length + seriesPending.length;
    document.getElementById('globalShopping').innerText = shoppingPending;
    
    // Work stats (CORREGIDO)
    document.getElementById('workWeekly').innerText = accumulatedHours.toFixed(1);
    document.getElementById('workToday').innerText = todayHours.toFixed(1);
    document.getElementById('workRemaining').innerText = remaining.toFixed(1);
    const workProgress = document.getElementById('workProgress');
    if (workProgress) workProgress.style.width = percent + '%';
    
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
            const dayConfig = settings[day.id] || {};
            if (dayConfig.isVacation) hours = 8;
            else if (dayConfig.isTelework) hours = idx === 4 ? 8 : 9;
            else if (dayConfig.customHours) hours = dayConfig.customHours;
            else if (idx < currentDayIdx) hours = 8;
            else hours = '?';
            html += `<div class="category-item"><strong>${dayNames[idx]}</strong><br>${typeof hours === 'number' ? hours + 'h' : hours}</div>`;
        });
        distributionDiv.innerHTML = html;
    }
}