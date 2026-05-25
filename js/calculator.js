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
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return dayIndex === 4 ? 8 : 9;
    if (dayConfig?.customHours) return dayConfig.customHours;
    return 8;
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
        btn.onclick = () => { currentDay = day.id; renderDaySelector(); renderConfigPanel(); };
        container.appendChild(btn);
    });
}

function renderConfigPanel() {
    const panel = document.getElementById('configPanel');
    if (!panel) return;
    const userData = getUserData();
    if (!userData) { panel.innerHTML = '<p>Cargando...</p>'; return; }
    
    const settings = userData.workSettings || {};
    const day = days.find(d => d.id === currentDay);
    const dayConfig = settings[currentDay] || {};
    const globalStartTime = settings.globalStartTime || '08:30';
    const currentStartTime = dayConfig.customStartTime || globalStartTime;
    const currentHours = getDayHours(currentDay, day.index, settings);
    
    panel.innerHTML = `
        <h3>Configuración para ${day.name}</h3>
        <div class="input-row">
            <div class="input-field">
                <label><i class="fas fa-clock"></i> Hora de entrada</label>
                <input type="time" id="startTimeInput" value="${currentStartTime}" class="glass-input">
            </div>
        </div>
        <div class="checkbox-group">
            <label><input type="checkbox" id="teleworkCheck" ${dayConfig.isTelework ? 'checked' : ''}> <i class="fas fa-home"></i> Teletrabajo (${day.index === 4 ? '8h' : '9h'})</label>
            <label><input type="checkbox" id="vacationCheck" ${dayConfig.isVacation ? 'checked' : ''}> <i class="fas fa-umbrella-beach"></i> Vacaciones (8h)</label>
        </div>
        <div class="input-row">
            <div class="input-field">
                <label><i class="fas fa-hourglass-half"></i> Horas personalizadas</label>
                <input type="number" id="customHours" step="0.5" min="0" max="14" value="${dayConfig.customHours || ''}" placeholder="Ej: 7.5" class="glass-input">
            </div>
        </div>
        <div class="result-box">
            <p>📌 Este día trabajarás: <strong id="dayHoursPreview">${currentHours}</strong> horas</p>
            <p>🚪 Hora de salida: <strong id="exitTimePreview">--:--</strong></p>
            ${day.index !== 4 ? '<p style="font-size:0.75rem;">🍽️ +30 min de comida (no computan)</p>' : '<p style="font-size:0.75rem;">✨ Viernes: sin pausa de comida</p>'}
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
        if (vacationCheck?.checked) hours = 8;
        else if (teleworkCheck?.checked) hours = day.index === 4 ? 8 : 9;
        else if (customHours?.value) hours = parseFloat(customHours.value);
        const startTime = startTimeInput?.value || '08:30';
        const [sH, sM] = startTime.split(':').map(Number);
        const hasLunch = day.index !== 4;
        const exitMinutes = (sH * 60 + sM) + (hours * 60) + (hasLunch ? 30 : 0);
        const exitHour = Math.floor(exitMinutes / 60);
        const exitMin = exitMinutes % 60;
        const hoursPreview = document.getElementById('dayHoursPreview');
        const exitPreview = document.getElementById('exitTimePreview');
        if (hoursPreview) hoursPreview.innerText = hours;
        if (exitPreview) exitPreview.innerText = `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
    }
    
    if (teleworkCheck) teleworkCheck.onchange = () => { if (teleworkCheck.checked) { if(vacationCheck) vacationCheck.checked = false; if(customHours) customHours.value = ''; } updatePreview(); };
    if (vacationCheck) vacationCheck.onchange = () => { if (vacationCheck.checked) { if(teleworkCheck) teleworkCheck.checked = false; if(customHours) customHours.value = ''; } updatePreview(); };
    if (customHours) customHours.oninput = () => { if (customHours.value) { if(teleworkCheck) teleworkCheck.checked = false; if(vacationCheck) vacationCheck.checked = false; } updatePreview(); };
    if (startTimeInput) startTimeInput.onchange = updatePreview;
    
    if (saveBtn) saveBtn.onclick = () => {
        const userData = getUserData();
        if (!userData) return;
        if (!userData.workSettings) userData.workSettings = {};
        userData.workSettings[currentDay] = {
            isTelework: teleworkCheck?.checked || false,
            isVacation: vacationCheck?.checked || false,
            customHours: customHours?.value ? parseFloat(customHours.value) : null,
            customStartTime: startTimeInput?.value !== globalStartTime ? startTimeInput?.value : null
        };
        saveUserData(userData);
        renderDaySelector();
        updateWeeklySummary();
        showToast('Configuración guardada');
    };
    
    if (resetBtn) resetBtn.onclick = () => {
        const userData = getUserData();
        if (!userData) return;
        if (userData.workSettings) delete userData.workSettings[currentDay];
        saveUserData(userData);
        renderDaySelector();
        renderConfigPanel();
        updateWeeklySummary();
        showToast('Configuración restablecida');
    };
    
    updatePreview();
}

function updateWeeklySummary() {
    const userData = getUserData();
    if (!userData) return;
    const settings = userData.workSettings || {};
    let total = 0;
    days.forEach((day, idx) => { total += getDayHours(day.id, idx, settings); });
    const difference = total - 40;
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    if (totalSpan) totalSpan.innerText = total.toFixed(1);
    if (diffSpan) diffSpan.innerText = difference.toFixed(1);
    if (msgSpan) {
        if (difference > 0) msgSpan.innerHTML = `⚠️ Vas a trabajar ${difference.toFixed(1)} horas extra esta semana.`;
        else if (difference < 0) msgSpan.innerHTML = `📉 Te faltan ${Math.abs(difference).toFixed(1)} horas.`;
        else msgSpan.innerHTML = `✅ ¡Perfecto! Cumples exactamente las 40 horas.`;
    }
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'calculator' && currentPage === 'calculator.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    renderDaySelector();
    renderConfigPanel();
    updateWeeklySummary();
    initDockActive();
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});