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

// Calcular hora de salida MÍNIMA (16:30)
function getMinExitTime(dayIndex, startTime) {
    return calculateExitTimeFromHours(startTime, getMinHoursForDay(dayIndex, startTime), dayIndex);
}

function getMinHoursForDay(dayIndex, startTime) {
    const [sH, sM] = startTime.split(':').map(Number);
    const minExitMinutes = 16 * 60 + 30;
    let workMinutes = minExitMinutes - (sH * 60 + sM);
    const hasLunch = dayIndex !== 4;
    if (hasLunch) workMinutes -= 30;
    return Math.max(0, Math.round((workMinutes / 60) * 10) / 10);
}

// Función principal: calcula todas las horas de la semana
function calculateAllHours() {
    const result = {};
    let totalFixed = 0;
    const flexibleDays = [];
    const currentDayIdx = getCurrentDayIndex();
    
    // Primera pasada: calcular horas fijas (vacaciones, teletrabajo, salidas manuales)
    for (const day of days) {
        const dayConfig = currentSettings[day.id] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        const isPastDay = day.index < currentDayIdx;
        
        if (dayConfig.isVacation) {
            totalFixed += 8;
            result[day.id] = 8;
        } 
        else if (dayConfig.isTelework) {
            const hours = getFixedTeleworkHours(day.index);
            totalFixed += hours;
            result[day.id] = hours;
        }
        else if (dayConfig.customExitTime && isPastDay) {
            // Día pasado con salida manual: mantener esa salida
            const hours = calculateHoursFromTimes(startTime, dayConfig.customExitTime, day.index);
            if (hours !== null) {
                totalFixed += hours;
                result[day.id] = hours;
            } else {
                totalFixed += 8;
                result[day.id] = 8;
            }
        }
        else if (dayConfig.customExitTime && !isPastDay) {
            // Día futuro con salida manual: usar esa salida
            const hours = calculateHoursFromTimes(startTime, dayConfig.customExitTime, day.index);
            if (hours !== null) {
                totalFixed += hours;
                result[day.id] = hours;
            } else {
                flexibleDays.push(day);
            }
        }
        else if (isPastDay) {
            // Día pasado sin configuración especial
            totalFixed += 8;
            result[day.id] = 8;
        }
        else {
            flexibleDays.push(day);
        }
    }
    
    const remainingHours = 40 - totalFixed;
    
    if (flexibleDays.length > 0 && remainingHours > 0) {
        // Reparto equitativo entre días flexibles futuros
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
            result[day.id] = 0;
        }
    }
    
    return result;
}

function getDayHours(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const currentDayIdx = getCurrentDayIndex();
    const isPastDay = dayIndex < currentDayIdx;
    
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return getFixedTeleworkHours(dayIndex);
    if (dayConfig?.customHours) return dayConfig.customHours;
    
    // Días pasados: usar horas reales (o 8 por defecto)
    if (isPastDay) {
        if (dayConfig?.customExitTime) {
            const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
            const hours = calculateHoursFromTimes(startTime, dayConfig.customExitTime, dayIndex);
            if (hours !== null) return hours;
        }
        return 8;
    }
    
    const allHours = calculateAllHours();
    const hours = allHours[dayId] || getMinHoursForDay(dayIndex, dayConfig?.customStartTime || currentSettings.globalStartTime);
    return Math.round(hours * 10) / 10;
}

function getDayExitTime(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const startTime = dayConfig?.customStartTime || currentSettings.globalStartTime;
    const customExit = dayConfig?.customExitTime;
    const hours = getDayHours(dayId, dayIndex);
    const currentDayIdx = getCurrentDayIndex();
    const isPastDay = dayIndex < currentDayIdx;
    
    if (dayConfig?.isVacation) return 'Vacaciones';
    if (dayConfig?.isTelework) return 'Teletrabajo';
    
    // Si es día pasado y tiene salida manual, mantenerla
    if (isPastDay && customExit) return customExit;
    
    // Si tiene salida manual futura, mantenerla
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
        
        // Para días pasados, los campos son solo texto (no editables)
        const showStartInput = !isTelework && !isVacation && !isPastDay;
        const showExitInput = !isTelework && !isVacation && !isPastDay;
        
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
                ${showStartInput ? 
                    `<input type="time" class="startTimeInput" data-day="${day.id}" value="${startTime}" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 110px;">` : 
                    (isPastDay && startTime ? `<span style="color: var(--text-secondary);">${startTime}</span>` : '<span style="color: var(--text-secondary);">---</span>')}
              </td>
            <td style="padding: 12px; text-align: center;">
                ${showExitInput ? 
                    `<input type="time" class="exitTimeInput" data-day="${day.id}" value="${exitTime !== '--:--' && exitTime !== 'Vacaciones' && exitTime !== 'Teletrabajo' ? exitTime : ''}" placeholder="auto" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 110px;">` : 
                    (isPastDay && exitTime && exitTime !== '--:--' ? `<span style="color: var(--text-secondary);">${exitTime}</span>` : '<span style="color: var(--text-secondary);">---</span>')}
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
        `;
        tbody.appendChild(row);
    });
    
    // Event listeners solo para días futuros
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
    
    for (let i = 0; i <= currentDayIdx; i++) {
        const dayId = dayNames[i];
        const dayConfig = currentSettings[dayId] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        
        if (dayConfig.isVacation) {
            accumulated += 8;
        } else if (dayConfig.isTelework) {
            accumulated += i === 4 ? 8 : 9;
        } else if (dayConfig.customHours) {
            accumulated += dayConfig.customHours;
        } else if (dayConfig.customExitTime) {
            const hours = calculateHoursFromTimes(startTime, dayConfig.customExitTime, i);
            if (hours !== null) {
                accumulated += hours;
            } else {
                accumulated += 8;
            }
        } else if (i < currentDayIdx) {
            accumulated += 8;
        } else if (i === currentDayIdx) {
            accumulated += calculateTodayHoursReal();
        }
    }
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
    
    if (window.updateStatsFromCalculator) window.updateStatsFromCalculator(accumulated, remaining, percent);
}

function applyGlobalTime() {
    const globalTime = document.getElementById('globalStartTime').value;
    currentSettings.globalStartTime = globalTime;
    const currentDayIdx = getCurrentDayIndex();
    days.forEach(day => {
        if (currentSettings[day.id] && day.index >= currentDayIdx && !currentSettings[day.id].customExitTime) {
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
        if (currentSettings[day.id] && day.index >= currentDayIdx) {
            delete currentSettings[day.id].customExitTime;
        }
    });
    renderTable();
    updateSummary();
    showToast('🔄 Horas futuras recalculadas');
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