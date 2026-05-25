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

function getCurrentDayIndex() {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return -1;
    return day - 1;
}

function calculateTodayHours() {
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
    
    let totalWorkHours = 8;
    if (dayConfig.isVacation) totalWorkHours = 8;
    else if (dayConfig.isTelework) totalWorkHours = dayIndex === 4 ? 8 : 9;
    else if (dayConfig.customHours) totalWorkHours = dayConfig.customHours;
    
    return Math.min(workedMinutes / 60, totalWorkHours);
}

function calculateActualAccumulatedHours() {
    const userData = getUserData();
    if (!userData) return 0;
    const settings = userData.workSettings || {};
    
    const currentDayIdx = getCurrentDayIndex();
    if (currentDayIdx === -1) return 0;
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let accumulated = 0;
    
    for (let i = 0; i < currentDayIdx; i++) {
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

function initDraggableDock() {
    const dock = document.querySelector('.floating-dock');
    if (!dock) return;
    
    let isDragging = false;
    let startX;
    let startPage = window.location.pathname.split('/').pop();
    
    const links = Array.from(dock.querySelectorAll('.dock-item'));
    const pages = links.map(link => link.getAttribute('data-page'));
    
    dock.addEventListener('mousedown', (e) => {
        if (e.target.closest('.dock-item')) return;
        isDragging = true;
        startX = e.clientX;
        dock.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        if (Math.abs(deltaX) > 80) {
            isDragging = false;
            dock.style.cursor = 'grab';
            
            const currentIndex = pages.indexOf(startPage);
            let newIndex = currentIndex;
            
            if (deltaX < 0 && currentIndex < pages.length - 1) {
                newIndex = currentIndex + 1;
            } else if (deltaX > 0 && currentIndex > 0) {
                newIndex = currentIndex - 1;
            }
            
            if (newIndex !== currentIndex && pages[newIndex]) {
                window.location.href = `${pages[newIndex]}.html`;
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        dock.style.cursor = 'grab';
    });
    
    dock.style.cursor = 'grab';
}

// Llamar al cargar cada página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDraggableDock);
} else {
    initDraggableDock();
}

