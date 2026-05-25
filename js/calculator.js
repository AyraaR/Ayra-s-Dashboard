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

// Horas FIJAS para teletrabajo (no negociables)
function getFixedTeleworkHours(dayIndex) {
    return dayIndex === 4 ? 8 : 9; // Viernes 8h, L-J 9h
}

// Calcula las horas que debe trabajar un día presencial para ajustar a 40h semanales
function calculateFlexibleHours(teleworkDays, vacationDays) {
    // Sumar horas fijas de teletrabajo
    let fixedTotal = 0;
    teleworkDays.forEach(dayIndex => {
        fixedTotal += getFixedTeleworkHours(dayIndex);
    });
    
    // Vacaciones = 8h fijas también
    fixedTotal += vacationDays.length * 8;
    
    // Días presenciales restantes
    const presencialDays = days.filter(day => 
        !teleworkDays.includes(day.index) && !vacationDays.includes(day.index)
    ).length;
    
    if (presencialDays === 0) return [];
    
    // Horas restantes para llegar a 40
    const remainingHours = 40 - fixedTotal;
    // Distribuir equitativamente entre días presenciales
    const hoursPerDay = remainingHours / presencialDays;
    
    // Asignar horas a cada día presencial
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
    
    // Vacaciones primero
    if (dayConfig?.isVacation) return 8;
    
    // Teletrabajo tiene horas fijas
    if (dayConfig?.isTelework) return getFixedTeleworkHours(dayIndex);
    
    // Horas personalizadas
    if (dayConfig?.customHours) return dayConfig.customHours;
    
    // Para días presenciales, calcular de forma flexible
    const teleworkDays = [];
    const vacationDays = [];
    days.forEach(day => {
        const cfg = currentSettings[day.id];
        if (cfg?.isTelework) teleworkDays.push(day.index);
        if (cfg?.isVacation) vacationDays.push(day.index);
    });
    
    const flexibleHours = calculateFlexibleHours(teleworkDays, vacationDays);
    
    if (flexibleHours[dayId]) {
        return flexibleHours[dayId];
    }
    
    return 8; // fallback
}

function calculateExitTime(dayId, dayIndex, startTime, hours) {
    if (hours === 0) return '--:--';
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
    
    // Recalcular horas flexibles para todos los días
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
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        
        let hours = 0;
        let isFlexible = false;
        
        if (dayConfig?.isVacation) {
            hours = 8;
        } else if (dayConfig?.isTelework) {
            hours = getFixedTeleworkHours(day.index);
        } else if (dayConfig?.customHours) {
            hours = dayConfig.customHours;
        } else {
            hours = flexibleHours[day.id] || 8;
            isFlexible = true;
        }
        
        const exitTime = hours > 0 ? calculateExitTime(day.id, day.index, startTime, hours) : 'Vacaciones';
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--glass-border)';
        row.innerHTML = `
            <td style="padding: 12px;"><strong>${day.name}</strong>${isFlexible ? '<br><small style="color: var(--accent);">flexible</small>' : ''}${dayConfig?.isVacation ? '<br><small style="color: var(--warning);">🌴 vacaciones</small>' : ''}${dayConfig?.isTelework ? '<br><small style="color: var(--success);">🏠 teletrabajo</small>' : ''}</td>
            <td style="padding: 12px; text-align: center;"><input type="time" class="startTimeInput" data-day="${day.id}" value="${startTime}" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 10px; color: white; width: 100px;"></td>
            <td style="padding: 12px; text-align: center;"><input type="checkbox" class="teleworkCheck" data-day="${day.id}" ${dayConfig?.isTelework ? 'checked' : ''} ${dayConfig?.isVacation ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);"></td>
            <td style="padding: 12px; text-align: center;"><input type="checkbox" class="vacationCheck" data-day="${day.id}" ${dayConfig?.isVacation ? 'checked' : ''} ${dayConfig?.isTelework ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);"></td>
            <td style="padding: 12px; text-align: center;"><strong style="color: var(--accent);">${hours.toFixed(1)}h</strong></td>
            <td style="padding: 12px; text-align: center;"><strong>${exitTime}</strong></td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners
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

function updateSummary() {
    let total = 0;
    days.forEach(day => {
        total += getDayHours(day.id, day.index);
    });
    const difference = Math.round((total - 40) * 10) / 10;
    const percent = Math.min(100, (total / 40) * 100);
    
    const totalSpan = document.getElementById('totalWeekHours');
    const diffSpan = document.getElementById('weekDifference');
    const msgSpan = document.getElementById('adjustmentMsg');
    const progressFill = document.getElementById('weeklyProgress');
    
    if (totalSpan) totalSpan.innerText = total.toFixed(1);
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
    
    // Obtener horas totales que debe trabajar hoy
    let totalWorkHours = 8;
    if (dayConfig?.isVacation) totalWorkHours = 8;
    else if (dayConfig?.isTelework) totalWorkHours = dayIndex === 4 ? 8 : 9;
    else if (dayConfig?.customHours) totalWorkHours = dayConfig.customHours;
    
    return Math.min(workedMinutes / 60, totalWorkHours);
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