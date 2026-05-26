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
    const startMinutes = timeToMinutes(startTime);
    const exitMinutes = timeToMinutes(exitTime);
    if (startMinutes === null || exitMinutes === null) return null;
    
    let worked = exitMinutes - startMinutes;
    const hasLunch = dayIndex !== 4;
    if (hasLunch && worked > 30) worked -= 30;
    return Math.max(0, worked);
}

function calculateExitTimeFromMinutes(startTime, workedMinutes, dayIndex) {
    const startMinutes = timeToMinutes(startTime);
    if (startMinutes === null || workedMinutes === null) return null;
    
    let totalMinutes = startMinutes + workedMinutes;
    const hasLunch = dayIndex !== 4;
    if (hasLunch) totalMinutes += 30;
    
    const MIN_EXIT = 16 * 60 + 30;
    if (totalMinutes < MIN_EXIT) totalMinutes = MIN_EXIT;
    return minutesToTime(totalMinutes);
}

function getMinMinutesForDay(dayIndex, startTime) {
    const startMinutes = timeToMinutes(startTime);
    if (startMinutes === null) return 0;
    const MIN_EXIT = 16 * 60 + 30;
    let workMinutes = MIN_EXIT - startMinutes;
    const hasLunch = dayIndex !== 4;
    if (hasLunch && workMinutes > 30) workMinutes -= 30;
    return Math.max(0, workMinutes);
}

function calculatePastMinutes() {
    const currentDayIdx = getCurrentDayIndex();
    let total = 0;
    
    for (let i = 0; i <= currentDayIdx; i++) {
        const day = days[i];
        const dayConfig = currentSettings[day.id] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        const exitTime = dayConfig.customExitTime;
        
        if (dayConfig.isVacation) {
            total += 8 * 60;
        } else if (dayConfig.isTelework) {
            total += getFixedTeleworkMinutes(i);
        } else if (exitTime) {
            const minutes = calculateWorkedMinutes(startTime, exitTime, i);
            total += (minutes !== null) ? minutes : getMinMinutesForDay(i, startTime);
        } else if (i < currentDayIdx) {
            total += getMinMinutesForDay(i, startTime);
        } else if (i === currentDayIdx) {
            total += calculateTodayWorkedMinutes();
        }
    }
    return total;
}

// NUEVA FUNCIÓN: calcular minutos para días futuros buscando MISMA hora de salida
function calculateFutureMinutesSameExit() {
    const result = {};
    const currentDayIdx = getCurrentDayIndex();
    const pastMinutes = calculatePastMinutes();
    let remainingMinutes = 40 * 60 - pastMinutes;
    
    // Identificar días flexibles futuros (sin teletrabajo, vacaciones, ni manuales)
    const flexibleDays = [];
    for (let i = currentDayIdx + 1; i < days.length; i++) {
        const day = days[i];
        const dayConfig = currentSettings[day.id] || {};
        
        if (dayConfig.isVacation) {
            remainingMinutes -= 8 * 60;
            result[day.id] = 8 * 60;
        } else if (dayConfig.isTelework) {
            const minutes = getFixedTeleworkMinutes(i);
            remainingMinutes -= minutes;
            result[day.id] = minutes;
        } else if (dayConfig.isManualExit && dayConfig.customExitTime) {
            const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
            const minutes = calculateWorkedMinutes(startTime, dayConfig.customExitTime, i);
            if (minutes !== null) {
                remainingMinutes -= minutes;
                result[day.id] = minutes;
            } else {
                flexibleDays.push(day);
            }
        } else {
            flexibleDays.push(day);
        }
    }
    
    if (flexibleDays.length === 0 || remainingMinutes <= 0) {
        return result;
    }
    
    // Buscar una hora de salida común que funcione para todos los días flexibles
    // Probamos diferentes horas de salida (de 16:30 a 19:00)
    let bestExitTime = null;
    let bestError = Infinity;
    
    for (let exitHour = 16; exitHour <= 19; exitHour++) {
        for (let exitMin = 0; exitMin < 60; exitMin += 5) {
            if (exitHour === 16 && exitMin < 30) continue;
            
            const testExitTime = `${exitHour.toString().padStart(2, '0')}:${exitMin.toString().padStart(2, '0')}`;
            let totalTestMinutes = 0;
            let valid = true;
            
            for (const day of flexibleDays) {
                const startTime = currentSettings[day.id]?.customStartTime || currentSettings.globalStartTime;
                const workedMinutes = calculateWorkedMinutes(startTime, testExitTime, day.index);
                if (workedMinutes === null || workedMinutes < getMinMinutesForDay(day.index, startTime)) {
                    valid = false;
                    break;
                }
                totalTestMinutes += workedMinutes;
            }
            
            if (valid) {
                const error = Math.abs(totalTestMinutes - remainingMinutes);
                if (error < bestError) {
                    bestError = error;
                    bestExitTime = testExitTime;
                }
            }
        }
    }
    
    // Si encontramos una hora común, usarla
    if (bestExitTime && bestError < 60) { // Menos de 1 hora de error
        for (const day of flexibleDays) {
            const startTime = currentSettings[day.id]?.customStartTime || currentSettings.globalStartTime;
            result[day.id] = calculateWorkedMinutes(startTime, bestExitTime, day.index);
        }
        return result;
    }
    
    // Si no, reparto equitativo
    const minutesPerDay = remainingMinutes / flexibleDays.length;
    let totalAssigned = 0;
    for (let i = 0; i < flexibleDays.length; i++) {
        const day = flexibleDays[i];
        let assigned = minutesPerDay;
        if (i === flexibleDays.length - 1) {
            assigned = remainingMinutes - totalAssigned;
        }
        const minMinutes = getMinMinutesForDay(day.index, currentSettings[day.id]?.customStartTime || currentSettings.globalStartTime);
        if (assigned < minMinutes) assigned = minMinutes;
        result[day.id] = Math.round(assigned);
        totalAssigned += assigned;
    }
    
    return result;
}

function getDayRequiredMinutes(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const currentDayIdx = getCurrentDayIndex();
    const startTime = dayConfig?.customStartTime || currentSettings.globalStartTime;
    
    if (dayConfig?.isVacation) return 8 * 60;
    if (dayConfig?.isTelework) return getFixedTeleworkMinutes(dayIndex);
    
    if (dayIndex <= currentDayIdx || dayConfig?.isManualExit) {
        if (dayConfig?.customExitTime) {
            const minutes = calculateWorkedMinutes(startTime, dayConfig.customExitTime, dayIndex);
            if (minutes !== null) return minutes;
        }
        if (dayIndex === currentDayIdx) return calculateTodayWorkedMinutes();
        return getMinMinutesForDay(dayIndex, startTime);
    }
    
    const futureMinutes = calculateFutureMinutesSameExit();
    return futureMinutes[dayId] !== undefined ? futureMinutes[dayId] : getMinMinutesForDay(dayIndex, startTime);
}

function getCalculatedExitTime(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const startTime = dayConfig?.customStartTime || currentSettings.globalStartTime;
    const minutes = getDayRequiredMinutes(dayId, dayIndex);
    
    if (dayConfig?.isVacation) return 'Vacaciones';
    if (dayConfig?.isTelework) return 'Teletrabajo';
    
    // Si es día flexible futuro, intentar usar misma hora que otros días
    const currentDayIdx = getCurrentDayIndex();
    if (dayIndex > currentDayIdx && !dayConfig?.isManualExit && !dayConfig?.isTelework && !dayConfig?.isVacation) {
        // Buscar la hora de salida común
        const futureResult = calculateFutureMinutesSameExit();
        if (futureResult[dayId]) {
            return calculateExitTimeFromMinutes(startTime, futureResult[dayId], dayIndex) || '--:--';
        }
    }
    
    return calculateExitTimeFromMinutes(startTime, minutes, dayIndex) || '--:--';
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
    const dayConfig = settings[today] || {};
    const startTime = dayConfig.customStartTime || settings.globalStartTime || '08:30';
    const exitTime = dayConfig.customExitTime;
    
    const startMinutes = timeToMinutes(startTime);
    if (startMinutes === null) return 0;
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (currentMinutes < startMinutes) return 0;
    
    let endMinutes = currentMinutes;
    if (exitTime) {
        const exitMinutes = timeToMinutes(exitTime);
        if (exitMinutes !== null && currentMinutes > exitMinutes) {
            endMinutes = exitMinutes;
        }
    }
    
    let worked = endMinutes - startMinutes;
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
        const dayConfig = currentSettings[day.id] || {};
        const isTelework = dayConfig.isTelework || false;
        const isVacation = dayConfig.isVacation || false;
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        const isPastDay = day.index < currentDayIdx;
        const isToday = day.index === currentDayIdx;
        
        const calculatedExit = getCalculatedExitTime(day.id, day.index);
        const manualExit = dayConfig.customExitTime || '';
        const minutes = getDayRequiredMinutes(day.id, day.index);
        const hoursDisplay = `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--glass-border)';
        row.innerHTML = `
            <td style="padding: 12px;">
                <strong>${day.name}</strong>
                ${isPastDay ? '<br><small style="color: var(--text-secondary);">✅ pasado</small>' : ''}
                ${isToday ? '<br><small style="color: var(--accent);">📅 hoy</small>' : ''}
                ${dayConfig.isManualExit ? '<br><small style="color: var(--success);">✏️ manual</small>' : ''}
                ${isVacation ? '<br><small style="color: var(--warning);">🌴 vacaciones</small>' : ''}
                ${isTelework ? '<br><small style="color: var(--success);">🏠 teletrabajo</small>' : ''}
                <br><small style="color: var(--accent);">${hoursDisplay}</small>
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
                <input type="checkbox" class="teleworkCheck" data-day="${day.id}" ${isTelework ? 'checked' : ''} ${isVacation ? 'disabled' : ''}>
                </td>
            <td style="padding: 12px; text-align: center;">
                <input type="checkbox" class="vacationCheck" data-day="${day.id}" ${isVacation ? 'checked' : ''} ${isTelework ? 'disabled' : ''}>
                </td>
        `;
        tbody.appendChild(row);
    }
    
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
        showToast(`📝 Salida manual: ${exitTime}`);
    } else {
        delete currentSettings[day].customExitTime;
        delete currentSettings[day].isManualExit;
        showToast(`🔄 Salida automática`);
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
    const totalMinutes = calculatePastMinutes();
    const totalHours = totalMinutes / 60;
    const remainingMinutes = Math.max(0, 40 * 60 - totalMinutes);
    const percent = Math.min(100, (totalMinutes / (40 * 60)) * 100);
    
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    const progressFill = document.getElementById('weeklyProgress');
    
    if (totalSpan) totalSpan.innerText = totalHours.toFixed(1);
    if (diffSpan) diffSpan.innerText = (remainingMinutes / 60).toFixed(1);
    if (progressFill) progressFill.style.width = percent + '%';
    
    if (msgSpan) {
        if (totalMinutes >= 40 * 60) msgSpan.innerHTML = '✅ ¡Has cumplido las 40 horas semanales! 🎉';
        else msgSpan.innerHTML = `📊 Llevas ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min. Te quedan ${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}min.`;
    }
    
    if (window.updateStatsFromCalculator) window.updateStatsFromCalculator(totalHours, remainingMinutes / 60, percent);
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

window.calculateTodayWorkedMinutes = calculateTodayWorkedMinutes;
window.updateSummary = updateSummary;