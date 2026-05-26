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

function getFixedTeleworkMinutes(dayIndex) {
    return dayIndex === 4 ? 480 : 540; // 8h = 480min, 9h = 540min
}

function getCurrentDayIndex() {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return -1;
    return day - 1;
}

function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Calcular minutos trabajados en un día (restando 30min de comida excepto viernes)
function calcWorkedMinutes(startTime, exitTime, dayIndex) {
    const start = timeToMinutes(startTime);
    const exit = timeToMinutes(exitTime);
    if (start === null || exit === null) return null;
    let worked = exit - start;
    const hasLunch = dayIndex !== 4;
    if (hasLunch && worked > 30) worked -= 30;
    return Math.max(0, worked);
}

// Calcular hora de salida desde minutos trabajados (sumando comida)
function calcExitFromWorked(startTime, workedMinutes, dayIndex) {
    const start = timeToMinutes(startTime);
    if (start === null || workedMinutes === null) return null;
    let total = start + workedMinutes;
    const hasLunch = dayIndex !== 4;
    if (hasLunch) total += 30;
    return minutesToTime(total);
}

// MINUTOS REALES TRABAJADOS EN DÍAS PASADOS
function getRealPastMinutes() {
    const currentDayIdx = getCurrentDayIndex();
    let total = 0;
    
    for (let i = 0; i <= currentDayIdx; i++) {
        const day = days[i];
        const cfg = currentSettings[day.id] || {};
        const start = cfg.customStartTime || currentSettings.globalStartTime;
        
        if (cfg.isVacation) {
            total += 480; // 8h
        } else if (cfg.isTelework) {
            total += getFixedTeleworkMinutes(i);
        } else if (cfg.customExitTime) {
            const worked = calcWorkedMinutes(start, cfg.customExitTime, i);
            total += worked !== null ? worked : 480;
        } else if (i < currentDayIdx) {
            total += 480;
        } else if (i === currentDayIdx) {
            total += getTodayWorkedMinutes();
        }
    }
    return total;
}

// MINUTOS TRABAJADOS HOY (hasta ahora)
function getTodayWorkedMinutes() {
    const userData = getUserData();
    if (!userData) return 0;
    const settings = userData.workSettings || {};
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[now.getDay() - 1];
    if (!today || now.getDay() === 6 || now.getDay() === 0) return 0;
    
    const dayIndex = dayNames.indexOf(today);
    const cfg = settings[today] || {};
    const start = cfg.customStartTime || settings.globalStartTime || '08:30';
    const exit = cfg.customExitTime;
    
    const startMin = timeToMinutes(start);
    if (startMin === null) return 0;
    
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin < startMin) return 0;
    
    let endMin = nowMin;
    if (exit) {
        const exitMin = timeToMinutes(exit);
        if (exitMin !== null && nowMin > exitMin) endMin = exitMin;
    }
    
    let worked = endMin - startMin;
    const hasLunch = dayIndex !== 4;
    if (hasLunch && worked > 30) worked -= 30;
    return Math.max(0, worked);
}

// Calcular minutos para días FUTUROS - BUSCANDO MISMA HORA DE SALIDA
function getFutureMinutes() {
    const result = {};
    const currentDayIdx = getCurrentDayIndex();
    let remainingMinutes = 2400 - getRealPastMinutes(); // 2400 = 40h
    
    // Primero, identificar días flexibles futuros
    const flexibleDays = [];
    for (let i = currentDayIdx + 1; i < days.length; i++) {
        const day = days[i];
        const cfg = currentSettings[day.id] || {};
        
        if (cfg.isVacation) {
            remainingMinutes -= 480;
            result[day.id] = 480;
        } else if (cfg.isTelework) {
            const mins = getFixedTeleworkMinutes(i);
            remainingMinutes -= mins;
            result[day.id] = mins;
        } else if (cfg.isManualExit && cfg.customExitTime) {
            const start = cfg.customStartTime || currentSettings.globalStartTime;
            const mins = calcWorkedMinutes(start, cfg.customExitTime, i);
            if (mins !== null) {
                remainingMinutes -= mins;
                result[day.id] = mins;
            } else {
                flexibleDays.push(day);
            }
        } else {
            flexibleDays.push(day);
        }
    }
    
    if (flexibleDays.length === 0) return result;
    if (remainingMinutes <= 0) return result;
    
    // Buscar una hora de salida común que cumpla exactamente las horas restantes
    // Probamos cada minuto desde 16:30 hasta 18:00
    let bestExit = null;
    let bestDiff = Infinity;
    let bestWorked = [];
    
    for (let exitMin = 990; exitMin <= 1080; exitMin++) { // 16:30 = 990, 18:00 = 1080
        let total = 0;
        let valid = true;
        const workedMins = [];
        
        for (const day of flexibleDays) {
            const start = currentSettings[day.id]?.customStartTime || currentSettings.globalStartTime;
            const worked = calcWorkedMinutes(start, minutesToTime(exitMin), day.index);
            if (worked === null || worked < 0) {
                valid = false;
                break;
            }
            workedMins.push(worked);
            total += worked;
        }
        
        if (valid) {
            const diff = Math.abs(total - remainingMinutes);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestExit = exitMin;
                bestWorked = [...workedMins];
            }
        }
    }
    
    if (bestExit !== null && bestDiff < 10) { // menos de 10 minutos de error
        // Ajustar el último día para compensar la diferencia exacta
        let totalAssigned = bestWorked.reduce((a, b) => a + b, 0);
        const diff = remainingMinutes - totalAssigned;
        
        for (let i = 0; i < flexibleDays.length; i++) {
            let mins = bestWorked[i];
            if (i === flexibleDays.length - 1 && Math.abs(diff) > 0) {
                mins = Math.max(0, mins + diff);
            }
            result[flexibleDays[i].id] = Math.round(mins);
        }
    } else {
        // Fallback: reparto equitativo
        const minsPerDay = remainingMinutes / flexibleDays.length;
        let totalAssigned = 0;
        for (let i = 0; i < flexibleDays.length; i++) {
            const day = flexibleDays[i];
            let mins = minsPerDay;
            if (i === flexibleDays.length - 1) {
                mins = remainingMinutes - totalAssigned;
            }
            result[day.id] = Math.round(mins);
            totalAssigned += mins;
        }
    }
    
    return result;
}

function getDayMinutes(dayId, dayIndex) {
    const cfg = currentSettings[dayId];
    const currentDayIdx = getCurrentDayIndex();
    const start = cfg?.customStartTime || currentSettings.globalStartTime;
    
    if (cfg?.isVacation) return 480;
    if (cfg?.isTelework) return getFixedTeleworkMinutes(dayIndex);
    
    if (dayIndex <= currentDayIdx || cfg?.isManualExit) {
        if (cfg?.customExitTime) {
            const mins = calcWorkedMinutes(start, cfg.customExitTime, dayIndex);
            if (mins !== null) return mins;
        }
        if (dayIndex === currentDayIdx) return getTodayWorkedMinutes();
        return 480;
    }
    
    const future = getFutureMinutes();
    return future[dayId] !== undefined ? future[dayId] : 480;
}

function getCalculatedExit(dayId, dayIndex) {
    const cfg = currentSettings[dayId];
    const start = cfg?.customStartTime || currentSettings.globalStartTime;
    const mins = getDayMinutes(dayId, dayIndex);
    
    if (cfg?.isVacation) return 'Vacaciones';
    if (cfg?.isTelework) return 'Teletrabajo';
    if (cfg?.customExitTime) return cfg.customExitTime;
    
    return calcExitFromWorked(start, mins, dayIndex) || '--:--';
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const currentDayIdx = getCurrentDayIndex();
    tbody.innerHTML = '';
    
    for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const cfg = currentSettings[day.id] || {};
        const isTelework = cfg.isTelework || false;
        const isVacation = cfg.isVacation || false;
        const start = cfg.customStartTime || currentSettings.globalStartTime;
        const isPastDay = day.index < currentDayIdx;
        const isToday = day.index === currentDayIdx;
        
        const mins = getDayMinutes(day.id, day.index);
        const hoursDisplay = `${Math.floor(mins / 60)}h ${mins % 60}min`;
        const calculatedExit = getCalculatedExit(day.id, day.index);
        const manualExit = cfg.customExitTime || '';
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--glass-border)';
        row.innerHTML = `
            <td style="padding: 12px;">
                <strong>${day.name}</strong>
                ${isPastDay ? '<br><small style="color: #888;">✅ pasado</small>' : ''}
                ${isToday ? '<br><small style="color: var(--accent);">📅 hoy</small>' : ''}
                ${cfg.isManualExit ? '<br><small style="color: #4cd964;">✏️ manual</small>' : ''}
                ${isVacation ? '<br><small style="color: #ffcc00;">🌴 vacaciones</small>' : ''}
                ${isTelework ? '<br><small style="color: #4cd964;">🏠 teletrabajo</small>' : ''}
                <br><small style="color: var(--accent);">${hoursDisplay}</small>
            </td>
            <td style="padding: 12px; text-align: center;">
                ${!isTelework && !isVacation ? 
                    `<input type="time" class="startInput" data-day="${day.id}" value="${start}" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 6px 10px; color: white; width: 110px;">` : 
                    '<span style="color: #888;">---</span>'}
                </td>
            <td style="padding: 12px; text-align: center;">
                ${!isTelework && !isVacation ? 
                    `<input type="time" class="exitInput" data-day="${day.id}" value="${manualExit}" placeholder="─" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 6px 10px; color: white; width: 110px;">` : 
                    '<span style="color: #888;">---</span>'}
                </td>
            <td style="padding: 12px; text-align: center;">
                <strong style="color: #5e5ce0;">${calculatedExit}</strong>
                </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="teleworkCheck" data-day="${day.id}" ${isTelework ? 'checked' : ''} ${isVacation ? 'disabled' : ''} style="accent-color: var(--accent);">
                </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="vacationCheck" data-day="${day.id}" ${isVacation ? 'checked' : ''} ${isTelework ? 'disabled' : ''} style="accent-color: var(--accent);">
                </td>
        `;
        tbody.appendChild(row);
    }
    
    document.querySelectorAll('.startInput').forEach(inp => {
        inp.removeEventListener('change', handleStartChange);
        inp.addEventListener('change', handleStartChange);
    });
    document.querySelectorAll('.exitInput').forEach(inp => {
        inp.removeEventListener('change', handleExitChange);
        inp.addEventListener('change', handleExitChange);
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

function handleStartChange(e) {
    const day = e.target.dataset.day;
    if (!currentSettings[day]) currentSettings[day] = {};
    currentSettings[day].customStartTime = e.target.value;
    renderTable();
    updateSummary();
}

function handleExitChange(e) {
    const day = e.target.dataset.day;
    const exit = e.target.value;
    if (!currentSettings[day]) currentSettings[day] = {};
    
    if (exit) {
        currentSettings[day].customExitTime = exit;
        currentSettings[day].isManualExit = true;
    } else {
        delete currentSettings[day].customExitTime;
        delete currentSettings[day].isManualExit;
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
        const vac = document.querySelector(`.vacationCheck[data-day="${day}"]`);
        if (vac) vac.checked = false;
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
        const tel = document.querySelector(`.teleworkCheck[data-day="${day}"]`);
        if (tel) tel.checked = false;
    }
    renderTable();
    updateSummary();
}

function updateSummary() {
    const totalMinutes = getRealPastMinutes();
    const remainingMinutes = Math.max(0, 2400 - totalMinutes);
    const percent = Math.min(100, (totalMinutes / 2400) * 100);
    
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    const progressFill = document.getElementById('weeklyProgress');
    
    if (totalSpan) totalSpan.innerText = (totalMinutes / 60).toFixed(1);
    if (diffSpan) diffSpan.innerText = (remainingMinutes / 60).toFixed(1);
    if (progressFill) progressFill.style.width = percent + '%';
    if (msgSpan) {
        msgSpan.innerHTML = `📊 Llevas ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min. Te quedan ${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}min.`;
    }
    
    if (window.updateStatsFromCalculator) window.updateStatsFromCalculator(totalMinutes / 60, remainingMinutes / 60, percent);
}

function applyGlobalTime() {
    const global = document.getElementById('globalStartTime').value;
    currentSettings.globalStartTime = global;
    renderTable();
    updateSummary();
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

window.getTodayWorkedMinutes = getTodayWorkedMinutes;
window.updateSummary = updateSummary;