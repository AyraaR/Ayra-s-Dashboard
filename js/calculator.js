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
    return dayIndex === 4 ? 8 * 60 : 9 * 60;
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

function calculateWorkedMinutes(startTime, exitTime, dayIndex) {
    const start = timeToMinutes(startTime);
    const exit = timeToMinutes(exitTime);
    if (start === null || exit === null) return null;
    
    let worked = exit - start;
    const hasLunch = dayIndex !== 4;
    if (hasLunch && worked > 30) worked -= 30;
    return Math.max(0, worked);
}

function calculateExitFromMinutes(startTime, workedMinutes, dayIndex) {
    const start = timeToMinutes(startTime);
    if (start === null || workedMinutes === null) return null;
    
    let total = start + workedMinutes;
    const hasLunch = dayIndex !== 4;
    if (hasLunch) total += 30;
    
    const MIN_EXIT = 16 * 60 + 30;
    if (total < MIN_EXIT) total = MIN_EXIT;
    return minutesToTime(total);
}

// Calcular minutos REALES trabajados en días pasados
function calculateRealPastMinutes() {
    const currentDayIdx = getCurrentDayIndex();
    let total = 0;
    
    for (let i = 0; i <= currentDayIdx; i++) {
        const day = days[i];
        const config = currentSettings[day.id] || {};
        const start = config.customStartTime || currentSettings.globalStartTime;
        
        if (config.isVacation) {
            total += 8 * 60;
        } else if (config.isTelework) {
            total += getFixedTeleworkMinutes(i);
        } else if (config.customExitTime) {
            const worked = calculateWorkedMinutes(start, config.customExitTime, i);
            total += worked !== null ? worked : 8 * 60;
        } else if (i < currentDayIdx) {
            total += 8 * 60;
        } else if (i === currentDayIdx) {
            total += calculateTodayWorkedMinutes();
        }
    }
    return total;
}

// Calcular minutos para días FUTUROS
function calculateFutureMinutes() {
    const result = {};
    const currentDayIdx = getCurrentDayIndex();
    const pastMinutes = calculateRealPastMinutes();
    let remainingMinutes = 40 * 60 - pastMinutes;
    
    // Primero restar días fijos
    for (let i = currentDayIdx + 1; i < days.length; i++) {
        const day = days[i];
        const config = currentSettings[day.id] || {};
        
        if (config.isVacation) {
            remainingMinutes -= 8 * 60;
            result[day.id] = 8 * 60;
        } else if (config.isTelework) {
            const minutes = getFixedTeleworkMinutes(i);
            remainingMinutes -= minutes;
            result[day.id] = minutes;
        } else if (config.isManualExit && config.customExitTime) {
            const start = config.customStartTime || currentSettings.globalStartTime;
            const minutes = calculateWorkedMinutes(start, config.customExitTime, i);
            if (minutes !== null) {
                remainingMinutes -= minutes;
                result[day.id] = minutes;
            }
        }
    }
    
    // Días flexibles restantes
    const flexibleDays = [];
    for (let i = currentDayIdx + 1; i < days.length; i++) {
        const day = days[i];
        const config = currentSettings[day.id] || {};
        if (!config.isVacation && !config.isTelework && !(config.isManualExit && config.customExitTime)) {
            flexibleDays.push(day);
        }
    }
    
    if (flexibleDays.length > 0 && remainingMinutes > 0) {
        const minutesPerDay = remainingMinutes / flexibleDays.length;
        let totalAssigned = 0;
        for (let i = 0; i < flexibleDays.length; i++) {
            const day = flexibleDays[i];
            let assigned = minutesPerDay;
            if (i === flexibleDays.length - 1) {
                assigned = remainingMinutes - totalAssigned;
            }
            result[day.id] = Math.round(assigned);
            totalAssigned += assigned;
        }
    } else if (flexibleDays.length > 0) {
        for (const day of flexibleDays) {
            const start = currentSettings[day.id]?.customStartTime || currentSettings.globalStartTime;
            result[day.id] = 8 * 60;
        }
    }
    
    return result;
}

function getDayMinutes(dayId, dayIndex) {
    const config = currentSettings[dayId];
    const currentDayIdx = getCurrentDayIndex();
    const start = config?.customStartTime || currentSettings.globalStartTime;
    
    if (config?.isVacation) return 8 * 60;
    if (config?.isTelework) return getFixedTeleworkMinutes(dayIndex);
    
    // Días pasados o con manual
    if (dayIndex <= currentDayIdx || config?.isManualExit) {
        if (config?.customExitTime) {
            const worked = calculateWorkedMinutes(start, config.customExitTime, dayIndex);
            if (worked !== null) return worked;
        }
        if (dayIndex === currentDayIdx) return calculateTodayWorkedMinutes();
        return 8 * 60;
    }
    
    const future = calculateFutureMinutes();
    return future[dayId] !== undefined ? future[dayId] : 8 * 60;
}

function getCalculatedExit(dayId, dayIndex) {
    const config = currentSettings[dayId];
    const start = config?.customStartTime || currentSettings.globalStartTime;
    const minutes = getDayMinutes(dayId, dayIndex);
    
    if (config?.isVacation) return 'Vacaciones';
    if (config?.isTelework) return 'Teletrabajo';
    if (config?.customExitTime) return config.customExitTime;
    
    return calculateExitFromMinutes(start, minutes, dayIndex) || '--:--';
}

function calculateTodayWorkedMinutes() {
    const userData = getUserData();
    if (!userData) return 0;
    const settings = userData.workSettings || {};
    const now = new Date();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const today = dayNames[now.getDay() - 1];
    if (!today || now.getDay() === 6 || now.getDay() === 0) return 0;
    
    const dayIndex = dayNames.indexOf(today);
    const config = settings[today] || {};
    const start = config.customStartTime || settings.globalStartTime || '08:30';
    const exit = config.customExitTime;
    
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

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const currentDayIdx = getCurrentDayIndex();
    tbody.innerHTML = '';
    
    for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const config = currentSettings[day.id] || {};
        const isTelework = config.isTelework || false;
        const isVacation = config.isVacation || false;
        const start = config.customStartTime || currentSettings.globalStartTime;
        const isPastDay = day.index < currentDayIdx;
        const isToday = day.index === currentDayIdx;
        
        const minutes = getDayMinutes(day.id, day.index);
        const hoursDisplay = `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
        const calculatedExit = getCalculatedExit(day.id, day.index);
        const manualExit = config.customExitTime || '';
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--glass-border)';
        row.innerHTML = `
            <td style="padding: 12px;">
                <strong>${day.name}</strong>
                ${isPastDay ? '<br><small>✅ pasado</small>' : ''}
                ${isToday ? '<br><small>📅 hoy</small>' : ''}
                ${config.isManualExit ? '<br><small>✏️ manual</small>' : ''}
                ${isVacation ? '<br><small>🌴 vacaciones</small>' : ''}
                ${isTelework ? '<br><small>🏠 teletrabajo</small>' : ''}
                <br><small>${hoursDisplay}</small>
            </td>
            <td style="padding: 12px; text-align: center;">
                ${!isTelework && !isVacation ? 
                    `<input type="time" class="startInput" data-day="${day.id}" value="${start}" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; width: 110px;">` : 
                    '<span>---</span>'}
                </td>
            <td style="padding: 12px; text-align: center;">
                ${!isTelework && !isVacation ? 
                    `<input type="time" class="exitInput" data-day="${day.id}" value="${manualExit}" placeholder="─" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; width: 110px;">` : 
                    '<span>---</span>'}
                </td>
            <td style="padding: 12px; text-align: center;">
                <strong>${calculatedExit}</strong>
                </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="teleworkCheck" data-day="${day.id}" ${isTelework ? 'checked' : ''} ${isVacation ? 'disabled' : ''}>
                </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="vacationCheck" data-day="${day.id}" ${isVacation ? 'checked' : ''} ${isTelework ? 'disabled' : ''}>
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
    const totalMinutes = calculateRealPastMinutes();
    const remainingMinutes = Math.max(0, 40 * 60 - totalMinutes);
    const percent = Math.min(100, (totalMinutes / (40 * 60)) * 100);
    
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
    alert('Configuración guardada');
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

window.calculateTodayWorkedMinutes = calculateTodayWorkedMinutes;
window.updateSummary = updateSummary;