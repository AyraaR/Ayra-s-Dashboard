const days = [
    { id: 'monday', name: 'Lunes', index: 0 },
    { id: 'tuesday', name: 'Martes', index: 1 },
    { id: 'wednesday', name: 'Miércoles', index: 2 },
    { id: 'thursday', name: 'Jueves', index: 3 },
    { id: 'friday', name: 'Viernes', index: 4 }
];

let currentSettings = {};

function loadSettings() {
    const userData = getUserData();
    if (userData && userData.workSettings) {
        currentSettings = JSON.parse(JSON.stringify(userData.workSettings));
    } else {
        currentSettings = { globalStartTime: '08:30' };
        days.forEach(day => { 
            currentSettings[day.id] = { 
                isTelework: false, 
                isVacation: false, 
                customHours: null, 
                customStartTime: null 
            }; 
        });
    }
    if (!currentSettings.globalStartTime) currentSettings.globalStartTime = '08:30';
    const globalInput = document.getElementById('globalStartTime');
    if (globalInput) globalInput.value = currentSettings.globalStartTime;
}

function saveSettings() {
    const userData = getUserData();
    if (userData) {
        userData.workSettings = currentSettings;
        saveUserData(userData);
    }
}

function getFixedTeleworkHours(dayIndex) {
    return dayIndex === 4 ? 8 : 9;
}

function getCurrentDayIndex() {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return -1;
    return day - 1;
}

// Calcula las horas para días FUTUROS basado en horas ya trabajadas
function calculateFutureHours() {
    const currentDayIdx = getCurrentDayIndex();
    if (currentDayIdx === -1) return {};
    
    let alreadyWorked = 0;
    let fixedFutureHours = 0;
    const futureFlexibleDays = [];
    
    days.forEach((day, idx) => {
        const dayConfig = currentSettings[day.id] || {};
        
        if (idx < currentDayIdx) {
            // Días pasados: sumamos lo que se trabajó o se tenía planeado
            if (dayConfig.isVacation) alreadyWorked += 8;
            else if (dayConfig.isTelework) alreadyWorked += getFixedTeleworkHours(idx);
            else if (dayConfig.customHours) alreadyWorked += dayConfig.customHours;
            else alreadyWorked += 8;
        } else if (idx === currentDayIdx) {
            // Hoy: sumamos lo que ya se ha trabajado hasta ahora
            alreadyWorked += calculateTodayHours();
            // Si hoy no es teletrabajo ni vacaciones, es flexible
            if (!dayConfig.isTelework && !dayConfig.isVacation && !dayConfig.customHours) {
                futureFlexibleDays.push(day);
            }
        } else {
            // Días futuros
            if (dayConfig.isVacation) fixedFutureHours += 8;
            else if (dayConfig.isTelework) fixedFutureHours += getFixedTeleworkHours(idx);
            else if (dayConfig.customHours) fixedFutureHours += dayConfig.customHours;
            else {
                futureFlexibleDays.push(day);
            }
        }
    });
    
    const remainingNeeded = 40 - alreadyWorked - fixedFutureHours;
    
    if (futureFlexibleDays.length === 0 || remainingNeeded <= 0) {
        return {};
    }
    
    // Repartir equitativamente entre los días flexibles futuros
    const hoursPerDay = remainingNeeded / futureFlexibleDays.length;
    
    const result = {};
    futureFlexibleDays.forEach(day => {
        result[day.id] = Math.round(hoursPerDay * 10) / 10;
    });
    return result;
}

function getDayHours(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const currentDayIdx = getCurrentDayIndex();
    
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return getFixedTeleworkHours(dayIndex);
    if (dayConfig?.customHours) return dayConfig.customHours;
    
    // Calcular horas flexibles para días futuros
    const futureHours = calculateFutureHours();
    if (futureHours[dayId]) {
        return futureHours[dayId];
    }
    
    return 8;
}

function calculateExitTime(dayId, dayIndex, startTime, hours) {
    if (hours === 0 || !startTime) return '--:--';
    const [sH, sM] = startTime.split(':').map(Number);
    const hasLunch = dayIndex !== 4 && hours > 0;
    const totalMinutes = (sH * 60 + sM) + (hours * 60) + (hasLunch ? 30 : 0);
    const exitHour = Math.floor(totalMinutes / 60);
    const exitMin = totalMinutes % 60;
    return `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const currentDayIdx = getCurrentDayIndex();
    
    tbody.innerHTML = '';
    days.forEach(day => {
        const dayConfig = currentSettings[day.id] || {};
        const isTelework = dayConfig.isTelework || false;
        const isVacation = dayConfig.isVacation || false;
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        const isPastDay = day.index < currentDayIdx;
        const isToday = day.index === currentDayIdx;
        
        let hours = getDayHours(day.id, day.index);
        hours = Math.round(hours * 10) / 10;
        
        let exitTime = '--:--';
        if (isVacation) {
            exitTime = 'Vacaciones';
        } else if (isTelework) {
            exitTime = 'Teletrabajo';
        } else if (!isPastDay) {
            exitTime = calculateExitTime(day.id, day.index, startTime, hours);
        }
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--glass-border)';
        row.innerHTML = `
            <td style="padding: 12px;">
                <strong>${day.name}</strong>
                ${isPastDay ? '<br><small style="color: var(--text-secondary);">✅ pasado</small>' : ''}
                ${isToday ? '<br><small style="color: var(--accent);">📅 hoy</small>' : ''}
                ${!isPastDay && !isToday && !isTelework && !isVacation ? '<br><small style="color: var(--accent);">📌 flexible</small>' : ''}
                ${isVacation ? '<br><small style="color: var(--warning);">🌴 vacaciones</small>' : ''}
                ${isTelework ? '<br><small style="color: var(--success);">🏠 teletrabajo</small>' : ''}
            </td>
            <td style="padding: 12px; text-align: center;">
                ${!isTelework && !isVacation && !isPastDay ? 
                    `<input type="time" class="startTimeInput" data-day="${day.id}" value="${startTime}" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 100px;">` : 
                    '<span style="color: var(--text-secondary);">---</span>'}
              </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="teleworkCheck" data-day="${day.id}" ${isTelework ? 'checked' : ''} ${isVacation || isPastDay ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);">
              </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="vacationCheck" data-day="${day.id}" ${isVacation ? 'checked' : ''} ${isTelework || isPastDay ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);">
              </td>
            <td style="padding: 12px; text-align: center;">
                <strong style="color: var(--accent);">${hours.toFixed(1)}h</strong>
              </td>
            <td style="padding: 12px; text-align: center;">
                <strong>${exitTime}</strong>
              </td>
        `;
        tbody.appendChild(row);
    });
    
    // Event listeners
    document.querySelectorAll('.startTimeInput').forEach(input => {
        input.removeEventListener('change', handleStartTimeChange);
        input.addEventListener('change', handleStartTimeChange);
    });
    
    document.querySelectorAll('.teleworkCheck').forEach(cb => {
        cb.removeEventListener('change', handleTeleworkChange);
        cb.addEventListener('change', handleTeleworkChange);
    });
    
    document.querySelectorAll('.vacationCheck').forEach(cb => {
        cb.removeEventListener('change', handleVacationChange);
        cb.addEventListener('change', handleVacationChange);
    });
}

function handleStartTimeChange(e) {
    const day = e.target.dataset.day;
    if (!currentSettings[day]) currentSettings[day] = {};
    currentSettings[day].customStartTime = e.target.value;
    renderTable();
    updateSummary();
}

function handleTeleworkChange(e) {
    const day = e.target.dataset.day;
    if (!currentSettings[day]) currentSettings[day] = {};
    currentSettings[day].isTelework = e.target.checked;
    if (e.target.checked) {
        currentSettings[day].isVacation = false;
        currentSettings[day].customHours = null;
        const vacationCheck = document.querySelector(`.vacationCheck[data-day="${day}"]`);
        if (vacationCheck) vacationCheck.checked = false;
    }
    renderTable();
    updateSummary();
}

function handleVacationChange(e) {
    const day = e.target.dataset.day;
    if (!currentSettings[day]) currentSettings[day] = {};
    currentSettings[day].isVacation = e.target.checked;
    if (e.target.checked) {
        currentSettings[day].isTelework = false;
        currentSettings[day].customHours = null;
        const teleworkCheck = document.querySelector(`.teleworkCheck[data-day="${day}"]`);
        if (teleworkCheck) teleworkCheck.checked = false;
    }
    renderTable();
    updateSummary();
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

function updateSummary() {
    const userData = getUserData();
    if (!userData) return;
    
    const currentDayIdx = getCurrentDayIndex();
    let accumulated = 0;
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (let i = 0; i < currentDayIdx; i++) {
        const dayId = dayNames[i];
        const dayConfig = currentSettings[dayId] || {};
        if (dayConfig.isVacation) accumulated += 8;
        else if (dayConfig.isTelework) accumulated += i === 4 ? 8 : 9;
        else if (dayConfig.customHours) accumulated += dayConfig.customHours;
        else accumulated += 8;
    }
    accumulated += calculateTodayHours();
    accumulated = Math.round(accumulated * 10) / 10;
    
    const remaining = Math.max(0, 40 - accumulated);
    const percent = Math.min(100, (accumulated / 40) * 100);
    
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    const progressFill = document.getElementById('weeklyProgress');
    
    if (totalSpan) totalSpan.innerText = accumulated.toFixed(1);
    if (diffSpan) diffSpan.innerText = remaining.toFixed(1);
    if (progressFill) progressFill.style.width = percent + '%';
    
    if (msgSpan) {
        if (accumulated >= 40) {
            msgSpan.innerHTML = '✅ ¡Has cumplido las 40 horas semanales! 🎉';
            msgSpan.style.color = 'var(--success)';
        } else {
            msgSpan.innerHTML = `📊 Llevas ${accumulated.toFixed(1)}h. Te quedan ${remaining.toFixed(1)}h para llegar a 40.`;
            msgSpan.style.color = 'var(--accent)';
        }
    }
}

function applyGlobalTime() {
    const globalTime = document.getElementById('globalStartTime').value;
    currentSettings.globalStartTime = globalTime;
    const currentDayIdx = getCurrentDayIndex();
    days.forEach(day => {
        if (currentSettings[day.id] && day.index >= currentDayIdx) {
            delete currentSettings[day.id].customStartTime;
        }
    });
    renderTable();
    updateSummary();
    showToast('⏰ Hora global aplicada a los días futuros');
}

function saveAll() {
    saveSettings();
    showToast('💾 Configuración guardada correctamente');
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
    loadSettings();
    renderTable();
    updateSummary();
    initDockActive();
    document.getElementById('applyGlobalBtn')?.addEventListener('click', applyGlobalTime);
    document.getElementById('saveAllBtn')?.addEventListener('click', saveAll);
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.calculateTodayHours = calculateTodayHours;