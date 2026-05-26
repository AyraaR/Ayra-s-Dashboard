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
                customStartTime: null,
                customExitTime: null,
                isManualExit: false
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

// Calcular horas trabajadas desde entrada hasta salida (restando comida)
function calculateWorkedHours(startTime, exitTime, dayIndex) {
    if (!startTime || !exitTime) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = exitTime.split(':').map(Number);
    
    let minutes = (eH * 60 + eM) - (sH * 60 + sM);
    const hasLunch = dayIndex !== 4; // Viernes no tiene comida
    if (hasLunch && minutes > 30) minutes -= 30;
    return Math.max(0, Math.round((minutes / 60) * 10) / 10);
}

// Calcular hora de salida desde horas trabajadas (añadiendo comida si toca)
function calculateExitTimeFromHours(startTime, hours, dayIndex) {
    if (!startTime || hours === null || hours <= 0) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const hasLunch = dayIndex !== 4;
    let totalMinutes = (sH * 60 + sM) + (hours * 60);
    if (hasLunch) totalMinutes += 30;
    
    // No hay mínimo de 16:30 para días normales
    const exitHour = Math.floor(totalMinutes / 60);
    const exitMin = totalMinutes % 60;
    return `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
}

// Calcular horas para días pasados (reales)
function calculatePastHours() {
    const currentDayIdx = getCurrentDayIndex();
    let total = 0;
    
    for (let i = 0; i <= currentDayIdx; i++) {
        const day = days[i];
        const dayConfig = currentSettings[day.id] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        const exitTime = dayConfig.customExitTime;
        
        if (dayConfig.isVacation) {
            total += 8;
        } else if (dayConfig.isTelework) {
            total += getFixedTeleworkHours(i);
        } else if (exitTime) {
            const hours = calculateWorkedHours(startTime, exitTime, i);
            total += (hours !== null) ? hours : 8;
        } else if (i < currentDayIdx) {
            total += 8;
        } else if (i === currentDayIdx) {
            total += calculateTodayWorkedHours();
        }
    }
    return Math.round(total * 10) / 10;
}

// Calcular horas para días FUTUROS (solo los que NO son manuales)
function calculateFutureHours() {
    const result = {};
    const currentDayIdx = getCurrentDayIndex();
    let totalFixed = 0;
    const flexibleDays = [];
    
    for (let i = currentDayIdx + 1; i < days.length; i++) {
        const day = days[i];
        const dayConfig = currentSettings[day.id] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        
        if (dayConfig.isVacation) {
            totalFixed += 8;
            result[day.id] = 8;
        } else if (dayConfig.isTelework) {
            const hours = getFixedTeleworkHours(i);
            totalFixed += hours;
            result[day.id] = hours;
        } else if (dayConfig.isManualExit && dayConfig.customExitTime) {
            const hours = calculateWorkedHours(startTime, dayConfig.customExitTime, i);
            if (hours !== null) {
                totalFixed += hours;
                result[day.id] = hours;
            } else {
                flexibleDays.push(day);
            }
        } else {
            flexibleDays.push(day);
        }
    }
    
    const pastHours = calculatePastHours();
    const remainingHours = 40 - pastHours - totalFixed;
    
    if (flexibleDays.length > 0 && remainingHours > 0) {
        let hoursPerDay = remainingHours / flexibleDays.length;
        hoursPerDay = Math.round(hoursPerDay * 10) / 10;
        
        let totalAssigned = 0;
        for (let i = 0; i < flexibleDays.length; i++) {
            const day = flexibleDays[i];
            let assigned = hoursPerDay;
            if (i === flexibleDays.length - 1) {
                assigned = remainingHours - totalAssigned;
                assigned = Math.round(assigned * 10) / 10;
            }
            result[day.id] = assigned;
            totalAssigned += assigned;
        }
    } else if (flexibleDays.length > 0) {
        for (const day of flexibleDays) {
            result[day.id] = 8;
        }
    }
    return result;
}

// Obtener horas que debe trabajar un día
function getDayRequiredHours(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const currentDayIdx = getCurrentDayIndex();
    
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return getFixedTeleworkHours(dayIndex);
    
    if (dayIndex <= currentDayIdx || dayConfig?.isManualExit) {
        if (dayConfig?.customExitTime) {
            const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
            const hours = calculateWorkedHours(startTime, dayConfig.customExitTime, dayIndex);
            if (hours !== null) return hours;
        }
        if (dayIndex === currentDayIdx) return calculateTodayWorkedHours();
        return 8;
    }
    
    const futureHours = calculateFutureHours();
    return futureHours[dayId] || 8;
}

// Obtener hora de salida calculada
function getCalculatedExitTime(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const startTime = dayConfig?.customStartTime || currentSettings.globalStartTime;
    const hours = getDayRequiredHours(dayId, dayIndex);
    
    if (dayConfig?.isVacation) return 'Vacaciones';
    if (dayConfig?.isTelework) return 'Teletrabajo';
    return calculateExitTimeFromHours(startTime, hours, dayIndex) || '--:--';
}

// Horas REALES trabajadas hoy (hasta ahora)
function calculateTodayWorkedHours() {
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
    return Math.max(0, workedMinutes / 60);
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const currentDayIdx = getCurrentDayIndex();
    tbody.innerHTML = '';
    
    for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const dayConfig = currentSettings[day.id] || {};
        const isTelework = dayConfig.isTelework || false;
        const isVacation = dayConfig.isVacation || false;
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        const isPastDay = day.index < currentDayIdx;
        const isToday = day.index === currentDayIdx;
        
        const calculatedExit = getCalculatedExitTime(day.id, day.index);
        const manualExit = dayConfig.customExitTime || '';
        const isManual = dayConfig.isManualExit || false;
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--glass-border)';
        row.innerHTML = `
            <td style="padding: 12px;">
                <strong>${day.name}</strong>
                ${isPastDay ? '<br><small style="color: var(--text-secondary);">✅ pasado</small>' : ''}
                ${isToday ? '<br><small style="color: var(--accent);">📅 hoy</small>' : ''}
                ${isManual ? '<br><small style="color: var(--success);">✏️ manual</small>' : ''}
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
                    `<input type="time" class="exitTimeInput" data-day="${day.id}" value="${manualExit}" placeholder="─" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 110px;">` : 
                    '<span style="color: var(--text-secondary);">---</span>'}
                </td>
            <td style="padding: 12px; text-align: center;">
                <strong style="color: var(--info);">${calculatedExit}</strong>
                </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="teleworkCheck" data-day="${day.id}" ${isTelework ? 'checked' : ''} ${isVacation ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);">
                </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="vacationCheck" data-day="${day.id}" ${isVacation ? 'checked' : ''} ${isTelework ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);">
                </td>
        `;
        tbody.appendChild(row);
    }
    
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
        currentSettings[day].isManualExit = true;
        showToast(`📝 Salida manual para ${days.find(d => d.id === day).name}: ${exitTime}`);
    } else {
        delete currentSettings[day].customExitTime;
        delete currentSettings[day].isManualExit;
        showToast(`🔄 Salida automática para ${days.find(d => d.id === day).name}`);
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
        delete currentSettings[day].customExitTime;
        delete currentSettings[day].isManualExit;
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
        delete currentSettings[day].customExitTime;
        delete currentSettings[day].isManualExit;
        const teleworkCheck = document.querySelector(`.teleworkCheck[data-day="${day}"]`);
        if (teleworkCheck) teleworkCheck.checked = false;
    }
    renderTable();
    updateSummary();
}

function updateSummary() {
    const total = calculatePastHours();
    const remaining = Math.max(0, 40 - total);
    const percent = Math.min(100, (total / 40) * 100);
    
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    const progressFill = document.getElementById('weeklyProgress');
    
    if (totalSpan) totalSpan.innerText = total.toFixed(1);
    if (diffSpan) diffSpan.innerText = remaining.toFixed(1);
    if (progressFill) progressFill.style.width = percent + '%';
    
    if (msgSpan) {
        if (total >= 40) msgSpan.innerHTML = '✅ ¡Has cumplido las 40 horas semanales! 🎉';
        else msgSpan.innerHTML = `📊 Llevas ${total.toFixed(1)}h. Te quedan ${remaining.toFixed(1)}h.`;
    }
    
    if (window.updateStatsFromCalculator) window.updateStatsFromCalculator(total, remaining, percent);
}

function applyGlobalTime() {
    const globalTime = document.getElementById('globalStartTime').value;
    currentSettings.globalStartTime = globalTime;
    days.forEach(day => {
        if (currentSettings[day.id] && !currentSettings[day.id].isManualExit) {
            delete currentSettings[day.id].customStartTime;
        }
    });
    renderTable();
    updateSummary();
    showToast('⏰ Hora global aplicada');
}

function recalculateAll() {
    const currentDayIdx = getCurrentDayIndex();
    days.forEach(day => {
        if (currentSettings[day.id] && day.index > currentDayIdx && !currentSettings[day.id].isManualExit) {
            delete currentSettings[day.id].customExitTime;
        }
    });
    renderTable();
    updateSummary();
    showToast('🔄 Horas futuras recalculadas');
}

function saveAll() {
    saveSettings();
    showToast('💾 Configuración guardada');
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

window.calculateTodayWorkedHours = calculateTodayWorkedHours;
window.updateSummary = updateSummary;