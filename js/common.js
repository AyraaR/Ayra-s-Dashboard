function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, isError = false) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: var(--accent); padding: 10px 20px; border-radius: 40px; z-index: 2000; font-size: 0.9rem;';
        document.body.appendChild(toast);
    }
    toast.style.background = isError ? 'var(--danger)' : 'var(--accent)';
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

function calculateActualAccumulatedHours() {
    const userData = getUserData();
    if (!userData) return 0;
    const settings = userData.workSettings || {};
    
    const now = new Date();
    const currentDayIndex = now.getDay(); // 0=domingo, 1=lunes...
    if (currentDayIndex === 0 || currentDayIndex === 6) return 0;
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let accumulated = 0;
    
    for (let i = 0; i < currentDayIndex - 1; i++) {
        const dayId = dayNames[i];
        const dayConfig = settings[dayId] || {};
        let hours = 8;
        
        if (dayConfig.isVacation) hours = 8;
        else if (dayConfig.isTelework) hours = i === 4 ? 8 : 9;
        else if (dayConfig.customHours) hours = dayConfig.customHours;
        
        accumulated += hours;
    }
    
    accumulated += calculateTodayHours();
    return Math.round(accumulated * 10) / 10;
}