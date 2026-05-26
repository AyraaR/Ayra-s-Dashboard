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
                customStartTime: null,
                customExitTime: null
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

// Calcular horas desde entrada hasta salida
function calculateHoursFromTimes(startTime, exitTime, dayIndex) {
    if (!startTime || !exitTime) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = exitTime.split(':').map(Number);
    let minutes = (eH * 60 + eM) - (sH * 60 + sM);
    const hasLunch = dayIndex !== 4;
    if (hasLunch) minutes -= 30;
    return Math.max(0, Math.round((minutes / 60) * 10) / 10);
}

// Calcular hora de salida desde horas trabajadas
function calculateExitTimeFromHours(startTime, hours, dayIndex) {
    if (!startTime || hours === null || hours <= 0) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const hasLunch = dayIndex !== 4;
    let totalMinutes = (sH * 60 + sM) + (hours * 60);
    if (hasLunch) totalMinutes += 30;
    const exitHour = Math.floor(totalMinutes / 60);
    const exitMin = totalMinutes % 60;
    return `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
}

// Función principal: calcula todas las horas de la semana basado en salidas manuales
function calculateAllHours() {
    const result = {};
    const fixedHours = {}; // Horas fijas por día (vacaciones, teletrabajo)
    let totalFixed = 0;
    const manualDays = []; // Días con salida manual
    const flexibleDays = []; // Días sin salida manual
    
    // Primera pasada: identificar días fijos y días con salida manual
    for (const day of days) {
        const dayConfig = currentSettings[day.id] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        
        if (dayConfig.isVacation) {
            fixedHours[day.id] = 8;
            totalFixed += 8;
            result[day.id] = 8;
        } else if (dayConfig.isTelework) {
            const hours = getFixedTeleworkHours(day.index);
            fixedHours[day.id] = hours;
            totalFixed += hours;
            result[day.id] = hours;
        } else if (dayConfig.customExitTime) {
            // Día con salida manual
            const hours = calculateHoursFromTimes(startTime, dayConfig.customExitTime, day.index);
            if (hours !== null) {
                fixedHours[day.id] = hours;
                totalFixed += hours;
                result[day.id] = hours;
                manualDays.push(day);
            } else {
                flexibleDays.push(day);
            }
        } else {
            flexibleDays.push(day);
        }
    }
    
    const remainingHours = 40 - totalFixed;
    
    if (flexibleDays.length > 0 && remainingHours > 0) {
        const hoursPerDay = remainingHours / flexibleDays.length;
        for (const day of flexibleDays) {
            const rounded = Math.round(hoursPerDay * 10) / 10;
            result[day.id] = rounded;
        }
    } else if (flexibleDays.length > 0) {
        for (const day of flexibleDays) {
            result[day.id] = 0;
        }
    }
    
    return result;
}

function getDayHours(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return getFixedTeleworkHours(dayIndex);
    if (dayConfig?.customHours) return dayConfig.customHours;
    
    const allHours = calculateAllHours();
    return allHours[dayId] || 8;
}

function getDayExitTime(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const startTime = dayConfig?.customStartTime || currentSettings.globalStartTime;
    const customExit = dayConfig?.customExitTime;
    const hours = getDayHours(dayId, dayIndex);
    
    if (dayConfig?.isVacation) return 'Vacaciones';
    if (dayConfig?.isTelework) return 'Teletrabajo';
    if (customExit) return customExit;
    
    return calculateExitTimeFromHours(startTime, hours, dayIndex) || '--:--';
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) {
        console.error('No se encontró el elemento tableBody');
        return;
    }
    
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
        
        const exitTime = getDayExitTime(day.id, day.index);
        
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
                ${!isTelework && !isVacation ? 
                    `<input type="time" class="startTimeInput" data-day="${day.id}" value="${startTime}" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 110px;">` : 
                    '<span style="color: var(--text-secondary);">---</span>'}
             </td>
            <td style="padding: 12px; text-align: center;">
                ${!isTelework && !isVacation ? 
                    `<input type="time" class="exitTimeInput" data-day="${day.id}" value="${exitTime !== '--:--' && exitTime !== 'Vacaciones' && exitTime !== 'Teletrabajo' ? exitTime : ''}" placeholder="auto" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 110px;">` : 
                    '<span style="color: var(--text-secondary);">---</span>'}
             </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="teleworkCheck" data-day="${day.id}" ${isTelework ? 'checked' : ''} ${isVacation ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);">
             </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="vacationCheck" data-day="${day.id}" ${isVacation ? 'checked' : ''} ${isTelework ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);">
             </td>
            <td style="padding: 12px; text-align: center;">
                <strong style="color: var(--accent);">${hours.toFixed(1)}h</strong>
             </td>
        `;
        tbody.appendChild(row);
    });
    
    // Event listeners
    document.querySelectorAll('.startTimeInput').forEach(input => {
        input.removeEventListener('change', handleStartTimeChange);
        input.addEventListener('change', handleStartTimeChange);
    });
    
    document.querySelectorAll('.exitTimeInput').forEach(input => {
        input.removeEventListener('change', handleExitTimeChange);
        input.addEventListener('change', handleExitTimeChange);
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

function handleExitTimeChange(e) {
    const day = e.target.dataset.day;
    const exitTime = e.target.value;
    if (!currentSettings[day]) currentSettings[day] = {};
    
    if (exitTime) {
        currentSettings[day].customExitTime = exitTime;
        // Limpiar cualquier hora personalizada que pudiera interferir
        delete currentSettings[day].customHours;
        showToast(`⏰ Salida manual para ${days.find(d => d.id === day).name}: ${exitTime}`);
    } else {
        delete currentSettings[day].customExitTime;
        showToast(`🔄 Salida automática restaurada para ${days.find(d => d.id === day).name}`);
    }
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
        delete currentSettings[day].customExitTime;
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
        delete currentSettings[day].customExitTime;
        const teleworkCheck = document.querySelector(`.teleworkCheck[data-day="${day}"]`);
        if (teleworkCheck) teleworkCheck.checked = false;
    }
    renderTable();
    updateSummary();
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
    const exitTime = dayConfig.customExitTime;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    if (currentHour < startHour || (currentHour === startHour && currentMin < startMin)) return 0;
    
    let endHour = currentHour;
    let endMin = currentMin;
    
    if (exitTime) {
        const [eH, eM] = exitTime.split(':').map(Number);
        if (currentHour > eH || (currentHour === eH && currentMin > eM)) {
            endHour = eH;
            endMin = eM;
        }
    }
    
    let workedMinutes = (endHour - startHour) * 60 + (endMin - startMin);
    const hasLunch = dayIndex !== 4;
    if (hasLunch && workedMinutes > 30) workedMinutes -= 30;
    
    return Math.max(0, Math.min(workedMinutes / 60, 12));
}

function updateSummary() {
    let accumulated = 0;
    const currentDayIdx = getCurrentDayIndex();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (let i = 0; i < currentDayIdx; i++) {
        const dayId = dayNames[i];
        const dayConfig = currentSettings[dayId] || {};
        if (dayConfig.isVacation) accumulated += 8;
        else if (dayConfig.isTelework) accumulated += i === 4 ? 8 : 9;
        else if (dayConfig.customHours) accumulated += dayConfig.customHours;
        else if (dayConfig.customExitTime) {
            const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
            const hours = calculateHoursFromTimes(startTime, dayConfig.customExitTime, i);
            if (hours !== null) accumulated += hours;
            else accumulated += 8;
        } else {
            accumulated += 8;
        }
    }
    accumulated += calculateTodayHoursReal();
    accumulated = Math.round(accumulated * 10) / 10;
    
    // Calcular total planificado para la semana (lo que dice la tabla)
    let plannedTotal = 0;
    days.forEach((day, idx) => {
        plannedTotal += getDayHours(day.id, idx);
    });
    plannedTotal = Math.round(plannedTotal * 10) / 10;
    
    const remaining = Math.max(0, 40 - accumulated);
    const percent = Math.min(100, (plannedTotal / 40) * 100);
    
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
    
    if (window.updateStatsFromCalculator) window.updateStatsFromCalculator(accumulated, remaining, percent);
}

function applyGlobalTime() {
    const globalTime = document.getElementById('globalStartTime').value;
    currentSettings.globalStartTime = globalTime;
    days.forEach(day => {
        if (currentSettings[day.id] && !currentSettings[day.id].customExitTime) {
            delete currentSettings[day.id].customStartTime;
        }
    });
    renderTable();
    updateSummary();
    showToast('⏰ Hora global aplicada');
}

function recalculateAll() {
    // Limpiar todas las salidas manuales
    days.forEach(day => {
        if (currentSettings[day.id]) {
            delete currentSettings[day.id].customExitTime;
        }
    });
    renderTable();
    updateSummary();
    showToast('🔄 Todas las horas recalculadas automáticamente');
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
    document.getElementById('recalculateBtn')?.addEventListener('click', recalculateAll);
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.calculateTodayHoursReal = calculateTodayHoursReal;
window.updateSummary = updateSummary;