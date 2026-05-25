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

// Calcula horas presenciales para cumplir 40h
function calculateFlexibleHours(teleworkDays, vacationDays) {
    let fixedTotal = 0;
    teleworkDays.forEach(dayIndex => {
        fixedTotal += getFixedTeleworkHours(dayIndex);
    });
    fixedTotal += vacationDays.length * 8;
    
    const presencialDays = days.filter(day => 
        !teleworkDays.includes(day.index) && !vacationDays.includes(day.index)
    ).length;
    
    if (presencialDays === 0) return {};
    
    const remainingHours = 40 - fixedTotal;
    const hoursPerDay = remainingHours / presencialDays;
    
    const result = {};
    days.forEach(day => {
        if (!teleworkDays.includes(day.index) && !vacationDays.includes(day.index)) {
            result[day.id] = Math.round(hoursPerDay * 10) / 10;
        }
    });
    return result;
}

function getDayHours(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return getFixedTeleworkHours(dayIndex);
    if (dayConfig?.customHours) return dayConfig.customHours;
    
    const teleworkDays = [];
    const vacationDays = [];
    days.forEach(day => {
        const cfg = currentSettings[day.id];
        if (cfg?.isTelework) teleworkDays.push(day.index);
        if (cfg?.isVacation) vacationDays.push(day.index);
    });
    const flexibleHours = calculateFlexibleHours(teleworkDays, vacationDays);
    return flexibleHours[dayId] || 8;
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
    
    const teleworkDays = [];
    const vacationDays = [];
    days.forEach(day => {
        const cfg = currentSettings[day.id];
        if (cfg?.isTelework) teleworkDays.push(day.index);
        if (cfg?.isVacation) vacationDays.push(day.index);
    });
    const flexibleHours = calculateFlexibleHours(teleworkDays, vacationDays);
    
    tbody.innerHTML = '';
    days.forEach(day => {
        const dayConfig = currentSettings[day.id] || {};
        const isTelework = dayConfig.isTelework || false;
        const isVacation = dayConfig.isVacation || false;
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        
        let hours = 0;
        if (isVacation) {
            hours = 8;
        } else if (isTelework) {
            hours = getFixedTeleworkHours(day.index);
        } else if (dayConfig.customHours) {
            hours = dayConfig.customHours;
        } else {
            hours = flexibleHours[day.id] || 8;
        }
        
        const exitTime = !isVacation && !isTelework ? calculateExitTime(day.id, day.index, startTime, hours) : 
                        (isVacation ? 'Vacaciones' : (isTelework ? 'Teletrabajo' : '--:--'));
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--glass-border)';
        row.innerHTML = `
            <td style="padding: 12px;">
                <strong>${day.name}</strong>
                ${!isTelework && !isVacation ? '<br><small style="color: var(--accent);">presencial</small>' : ''}
                ${isVacation ? '<br><small style="color: var(--warning);">🌴 vacaciones</small>' : ''}
                ${isTelework ? '<br><small style="color: var(--success);">🏠 teletrabajo</small>' : ''}
            </td>
            <td style="padding: 12px; text-align: center;">
                ${!isTelework && !isVacation ? 
                    `<input type="time" class="startTimeInput" data-day="${day.id}" value="${startTime}" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 100px;">` : 
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
            <td style="padding: 12px; text-align: center;">
                <strong>${exitTime}</strong>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Event listeners
    document.querySelectorAll('.startTimeInput').forEach(input => {
        input.addEventListener('change', (e) => {
            const day = e.target.dataset.day;
            if (!currentSettings[day]) currentSettings[day] = {};
            currentSettings[day].customStartTime = e.target.value;
            renderTable();
            updateSummary();
        });
    });
    
    document.querySelectorAll('.teleworkCheck').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const day = e.target.dataset.day;
            if (!currentSettings[day]) currentSettings[day] = {};
            currentSettings[day].isTelework = e.target.checked;
            if (e.target.checked) {
                currentSettings[day].isVacation = false;
                currentSettings[day].customHours = null;
                const vacationCheck = document.querySelector(`.vacationCheck[data-day="${day}"]`);
                if (vacationCheck) {
                    vacationCheck.checked = false;
                    vacationCheck.disabled = true;
                }
            } else {
                const vacationCheck = document.querySelector(`.vacationCheck[data-day="${day}"]`);
                if (vacationCheck) vacationCheck.disabled = false;
            }
            renderTable();
            updateSummary();
        });
    });
    
    document.querySelectorAll('.vacationCheck').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const day = e.target.dataset.day;
            if (!currentSettings[day]) currentSettings[day] = {};
            currentSettings[day].isVacation = e.target.checked;
            if (e.target.checked) {
                currentSettings[day].isTelework = false;
                currentSettings[day].customHours = null;
                const teleworkCheck = document.querySelector(`.teleworkCheck[data-day="${day}"]`);
                if (teleworkCheck) {
                    teleworkCheck.checked = false;
                    teleworkCheck.disabled = true;
                }
            } else {
                const teleworkCheck = document.querySelector(`.teleworkCheck[data-day="${day}"]`);
                if (teleworkCheck) teleworkCheck.disabled = false;
            }
            renderTable();
            updateSummary();
        });
    });
}

// Calcular horas REALES acumuladas en la semana (solo días pasados)
function calculateActualAccumulatedHours() {
    const userData = getUserData();
    if (!userData) return 0;
    const settings = userData.workSettings || {};
    
    const now = new Date();
    const currentDayIndex = now.getDay(); // 0=domingo, 1=lunes...
    if (currentDayIndex === 0 || currentDayIndex === 6) return 0; // fin de semana
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let accumulated = 0;
    
    for (let i = 0; i < currentDayIndex - 1; i++) {
        const dayId = dayNames[i];
        const dayConfig = settings[dayId] || {};
        let hours = 8;
        
        if (dayConfig.isVacation) hours = 8;
        else if (dayConfig.isTelework) hours = i === 4 ? 8 : 9;
        else if (dayConfig.customHours) hours = dayConfig.customHours;
        
        accumulated += hours;
    }
    
    // Añadir horas de hoy (reales hasta ahora)
    accumulated += calculateTodayHours();
    
    return Math.round(accumulated * 10) / 10;
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
    // Calcular total PLANIFICADO para la semana
    let plannedTotal = 0;
    days.forEach(day => {
        plannedTotal += getDayHours(day.id, day.index);
    });
    const difference = Math.round((plannedTotal - 40) * 10) / 10;
    const percent = Math.min(100, (plannedTotal / 40) * 100);
    
    // Mostrar horas REALES acumuladas
    const actualAccumulated = calculateActualAccumulatedHours();
    
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    const progressFill = document.getElementById('weeklyProgress');
    
    if (totalSpan) totalSpan.innerText = actualAccumulated.toFixed(1);
    if (diffSpan) diffSpan.innerText = difference;
    if (progressFill) progressFill.style.width = percent + '%';
    
    if (msgSpan) {
        if (Math.abs(difference) < 0.2) {
            msgSpan.innerHTML = '✅ ¡Perfecto! Cumples exactamente las 40 horas semanales.';
            msgSpan.style.color = 'var(--success)';
        } else if (difference > 0) {
            msgSpan.innerHTML = `⚠️ Vas a trabajar ${difference} horas extra esta semana. Puedes salir antes otros días.`;
            msgSpan.style.color = 'var(--warning)';
        } else {
            msgSpan.innerHTML = `📉 Te faltan ${Math.abs(difference)} horas. Tendrás que recuperarlas otros días.`;
            msgSpan.style.color = 'var(--warning)';
        }
    }
}

function applyGlobalTime() {
    const globalTime = document.getElementById('globalStartTime').value;
    currentSettings.globalStartTime = globalTime;
    days.forEach(day => {
        if (currentSettings[day.id]) {
            delete currentSettings[day.id].customStartTime;
        }
    });
    renderTable();
    updateSummary();
    showToast('⏰ Hora global aplicada a todos los días');
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