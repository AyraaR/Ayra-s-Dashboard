const days = [
    { id: 'monday', name: 'Lunes', index: 0 },
    { id: 'tuesday', name: 'Martes', index: 1 },
    { id: 'wednesday', name: 'Miércoles', index: 2 },
    { id: 'thursday', name: 'Jueves', index: 3 },
    { id: 'friday', name: 'Viernes', index: 4 }
];

let currentDay = 'monday';

function getDayHours(dayId, dayIndex, settings) {
    const dayConfig = settings[dayId];
    if (dayConfig && dayConfig.isVacation) return 8;
    if (dayConfig && dayConfig.isTelework) return dayIndex === 4 ? 8 : 9;
    if (dayConfig && dayConfig.customHours) return dayConfig.customHours;
    return 8;
}

function calculateExitTimeForDay(dayId, dayIndex, settings, startTime) {
    let workHours = getDayHours(dayId, dayIndex, settings);
    const dayConfig = settings[dayId];
    
    if (dayConfig && dayConfig.isVacation) return 'Vacaciones';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const hasLunch = dayIndex !== 4;
    const totalMinutes = (startHour * 60 + startMin) + (workHours * 60) + (hasLunch ? 30 : 0);
    const exitHour = Math.floor(totalMinutes / 60);
    const exitMin = totalMinutes % 60;
    
    return `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
}

function renderDaySelector() {
    const container = document.getElementById('daySelector');
    if (!container) return;
    
    const userData = getUserData();
    const settings = userData?.workSettings || {};
    
    container.innerHTML = '';
    days.forEach(day => {
        const dayConfig = settings[day.id];
        const btn = document.createElement('button');
        btn.className = `day-btn ${currentDay === day.id ? 'active' : ''}`;
        if (dayConfig?.isTelework) btn.classList.add('tel-work');
        if (dayConfig?.isVacation) btn.classList.add('vacation');
        btn.innerHTML = `${day.name} ${dayConfig?.isTelework ? '🏠' : ''} ${dayConfig?.isVacation ? '🌴' : ''}`;
        btn.addEventListener('click', () => {
            currentDay = day.id;
            renderDaySelector();
            renderConfigPanel();
        });
        container.appendChild(btn);
    });
}

function renderConfigPanel() {
    const panel = document.getElementById('configPanel');
    if (!panel) return;
    
    const userData = getUserData();
    if (!userData) return;
    
    const settings = userData.workSettings || {};
    const day = days.find(d => d.id === currentDay);
    const dayConfig = settings[currentDay] || { isTelework: false, isVacation: false, customHours: null, customStartTime: null };
    const globalStartTime = settings.globalStartTime || '08:30';
    const currentStartTime = dayConfig.customStartTime || globalStartTime;
    
    const currentHours = getDayHours(currentDay, day.index, settings);
    const currentExit = calculateExitTimeForDay(currentDay, day.index, settings, currentStartTime);
    
    panel.innerHTML = `
        <h3>Configuración para ${day.name}</h3>
        
        <div class="input-row">
            <div class="input-field">
                <label><i class="fas fa-clock"></i> Hora de entrada</label>
                <input type="time" id="startTimeInput" value="${currentStartTime}" class="glass-input">
            </div>
        </div>
        
        <div class="checkbox-group">
            <label>
                <input type="checkbox" id="teleworkCheck" ${dayConfig.isTelework ? 'checked' : ''}>
                <i class="fas fa-home"></i> Teletrabajo (${day.index === 4 ? '8h' : '9h'})
            </label>
            <label>
                <input type="checkbox" id="vacationCheck" ${dayConfig.isVacation ? 'checked' : ''}>
                <i class="fas fa-umbrella-beach"></i> Vacaciones (8h)
            </label>
        </div>
        
        <div class="input-row">
            <div class="input-field">
                <label><i class="fas fa-hourglass-half"></i> Horas personalizadas</label>
                <input type="number" id="customHours" step="0.5" min="0" max="14" 
                       value="${dayConfig.customHours || ''}" placeholder="Ej: 7.5" class="glass-input">
            </div>
        </div>
        
        <div class="result-box">
            <p>📌 Este día trabajarás: <strong id="dayHoursPreview">${currentHours}</strong> horas</p>
            <p>🚪 Hora de salida: <strong id="exitTimePreview">${currentExit}</strong></p>
            ${day.index !== 4 ? '<p style="font-size:0.75rem; margin-top:8px;">🍽️ +30 min de comida (no computan)</p>' : '<p style="font-size:0.75rem; margin-top:8px;">✨ Viernes: sin pausa de comida</p>'}
        </div>
        
        <button id="saveDayBtn" class="btn-primary"><i class="fas fa-save"></i> Guardar</button>
        <button id="resetDayBtn" class="btn-secondary" style="margin-top: 10px;"><i class="fas fa-undo"></i> Restablecer</button>
    `;
    
    const teleworkCheck = document.getElementById('teleworkCheck');
    const vacationCheck = document.getElementById('vacationCheck');
    const customHours = document.getElementById('customHours');
    const startTimeInput = document.getElementById('startTimeInput');
    const saveBtn = document.getElementById('saveDayBtn');
    const resetBtn = document.getElementById('resetDayBtn');
    
    function updatePreview() {
        let hours = 8;
        let isTele = teleworkCheck.checked;
        let isVac = vacationCheck.checked;
        let custom = customHours.value ? parseFloat(customHours.value) : null;
        
        if (isVac) {
            hours = 8;
        } else if (isTele) {
            hours = day.index === 4 ? 8 : 9;
        } else if (custom) {
            hours = custom;
        }
        
        const startTime = startTimeInput.value;
        const hasLunch = day.index !== 4;
        const [sH, sM] = startTime.split(':').map(Number);
        const exitMinutes = (sH * 60 + sM) + (hours * 60) + (hasLunch ? 30 : 0);
        const exitHour = Math.floor(exitMinutes / 60);
        const exitMin = exitMinutes % 60;
        
        const hoursPreview = document.getElementById('dayHoursPreview');
        const exitPreview = document.getElementById('exitTimePreview');
        if (hoursPreview) hoursPreview.innerText = hours;
        if (exitPreview) exitPreview.innerText = `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
    }
    
    if (teleworkCheck) teleworkCheck.addEventListener('change', () => {
        if (teleworkCheck.checked) {
            if (vacationCheck) vacationCheck.checked = false;
            if (customHours) customHours.value = '';
        }
        updatePreview();
    });
    
    if (vacationCheck) vacationCheck.addEventListener('change', () => {
        if (vacationCheck.checked) {
            if (teleworkCheck) teleworkCheck.checked = false;
            if (customHours) customHours.value = '';
        }
        updatePreview();
    });
    
    if (customHours) customHours.addEventListener('input', () => {
        if (customHours.value) {
            if (teleworkCheck) teleworkCheck.checked = false;
            if (vacationCheck) vacationCheck.checked = false;
        }
        updatePreview();
    });
    
    if (startTimeInput) startTimeInput.addEventListener('change', updatePreview);
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const userData = getUserData();
            if (!userData) return;
            
            const newConfig = {
                isTelework: teleworkCheck ? teleworkCheck.checked : false,
                isVacation: vacationCheck ? vacationCheck.checked : false,
                customHours: customHours && customHours.value ? parseFloat(customHours.value) : null,
                customStartTime: startTimeInput && startTimeInput.value !== globalStartTime ? startTimeInput.value : null
            };
            
            if (!userData.workSettings) userData.workSettings = {};
            userData.workSettings[currentDay] = newConfig;
            
            if (startTimeInput && startTimeInput.value === globalStartTime && userData.workSettings[currentDay]) {
                delete userData.workSettings[currentDay].customStartTime;
            }
            
            saveUserData(userData);
            renderDaySelector();
            updateWeeklySummary();
            alert('Configuración guardada');
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const userData = getUserData();
            if (!userData) return;
            if (userData.workSettings) delete userData.workSettings[currentDay];
            saveUserData(userData);
            renderDaySelector();
            renderConfigPanel();
            updateWeeklySummary();
        });
    }
    
    updatePreview();
}

function updateWeeklySummary() {
    const userData = getUserData();
    if (!userData) return;
    
    const settings = userData.workSettings || {};
    let total = 0;
    
    days.forEach((day, idx) => {
        total += getDayHours(day.id, idx, settings);
    });
    
    const difference = total - 40;
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    
    if (totalSpan) totalSpan.innerText = total.toFixed(1);
    if (diffSpan) diffSpan.innerText = difference.toFixed(1);
    
    if (msgSpan) {
        if (difference > 0) {
            msgSpan.innerHTML = `⚠️ Vas a trabajar ${difference.toFixed(1)} horas extra esta semana.`;
        } else if (difference < 0) {
            msgSpan.innerHTML = `📉 Te faltan ${Math.abs(difference).toFixed(1)} horas. Puedes recuperar otros días.`;
        } else {
            msgSpan.innerHTML = `✅ ¡Perfecto! Cumples exactamente las 40 horas semanales.`;
        }
    }
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === 'calculator' && currentPage === 'calculator.html') {
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
    const userNameSpan = document.getElementById('userName');
    if (user && userNameSpan) {
        userNameSpan.innerText = user.username;
    }
    
    renderDaySelector();
    renderConfigPanel();
    updateWeeklySummary();
    initDockActive();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => logoutUser());
});