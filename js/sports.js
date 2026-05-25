const EXERCISES_API_KEY = 'yrGkZh6ydpc3x2RUeCoDBJeSiVuSknITrE07AWBq';
const EXERCISES_API_URL = 'https://api.api-ninjas.com/v1/exercises';

let workouts = [];
let muscleStatus = {};
let availableExercises = [];
let selectedExercise = null;

const muscleGroups = {
    'chest': { name: 'Pecho', color: 'var(--accent)' },
    'back': { name: 'Espalda', color: 'var(--accent)' },
    'shoulders': { name: 'Hombros', color: 'var(--accent)' },
    'biceps': { name: 'Bíceps', color: 'var(--accent)' },
    'triceps': { name: 'Tríceps', color: 'var(--accent)' },
    'legs': { name: 'Piernas', color: 'var(--accent)' },
    'core': { name: 'Core', color: 'var(--accent)' },
    'cardio': { name: 'Cardio', color: 'var(--accent)' }
};

const muscleMapping = {
    'chest': 'chest', 'pecs': 'chest', 'pectoralis': 'chest',
    'back': 'back', 'lats': 'back', 'latissimus': 'back',
    'shoulders': 'shoulders', 'delts': 'shoulders', 'deltoid': 'shoulders',
    'biceps': 'biceps', 'bicep': 'biceps',
    'triceps': 'triceps', 'tricep': 'triceps',
    'legs': 'legs', 'quadriceps': 'legs', 'hamstrings': 'legs', 'glutes': 'legs', 'calves': 'legs',
    'core': 'core', 'abs': 'core', 'abdominals': 'core',
    'cardio': 'cardio'
};

async function loadExercises() {
    try {
        const response = await fetch(`${EXERCISES_API_URL}?muscle=all&limit=50`, {
            headers: { 'X-Api-Key': EXERCISES_API_KEY }
        });
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            availableExercises = data;
        } else {
            loadFallbackExercises();
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
        loadFallbackExercises();
    }
}

function loadFallbackExercises() {
    availableExercises = [
        { name: 'Press banca', muscle: 'chest' }, { name: 'Flexiones', muscle: 'chest' },
        { name: 'Dominadas', muscle: 'back' }, { name: 'Remo con barra', muscle: 'back' },
        { name: 'Sentadillas', muscle: 'legs' }, { name: 'Peso muerto', muscle: 'legs' },
        { name: 'Press militar', muscle: 'shoulders' }, { name: 'Curl bíceps', muscle: 'biceps' },
        { name: 'Fondos', muscle: 'triceps' }, { name: 'Plancha', muscle: 'core' },
        { name: 'Correr', muscle: 'cardio' }, { name: 'Natación', muscle: 'cardio' }
    ];
}

function loadSports() {
    const userData = getUserData();
    if (userData) {
        workouts = userData.workouts || [];
        muscleStatus = userData.muscleStatus || {};
    }
    for (let muscle in muscleGroups) {
        if (!muscleStatus[muscle]) {
            muscleStatus[muscle] = { fatigue: 0, lastWorkout: null, totalVolume: 0 };
        }
    }
    renderMuscleStats();
    renderWorkoutHistory();
}

function saveSports() {
    const userData = getUserData();
    if (userData) {
        userData.workouts = workouts;
        userData.muscleStatus = muscleStatus;
        saveUserData(userData);
    }
    if (window.updateStats) window.updateStats();
}

async function searchExercises() {
    const query = document.getElementById('searchExerciseInput').value.trim();
    const resultsDiv = document.getElementById('exerciseSearchResults');
    
    if (!query) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">🔍 Escribe un ejercicio para buscar</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Buscando...</div>';
    
    try {
        const response = await fetch(`${EXERCISES_API_URL}?name=${encodeURIComponent(query)}&limit=15`, {
            headers: { 'X-Api-Key': EXERCISES_API_KEY }
        });
        const data = await response.json();
        
        let results = [];
        if (Array.isArray(data) && data.length > 0) {
            results = data;
        } else {
            results = availableExercises.filter(ex => 
                ex.name.toLowerCase().includes(query.toLowerCase())
            );
        }
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">❌ No se encontraron ejercicios</div>';
            return;
        }
        
        resultsDiv.innerHTML = results.map(ex => {
            const muscleName = muscleGroups[ex.muscle]?.name || ex.muscle;
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
                    <div>
                        <strong style="color: var(--accent);">${ex.name}</strong>
                        <small style="display: block; color: var(--text-secondary);">${muscleName}</small>
                    </div>
                    <button onclick="selectExercise('${ex.name.replace(/'/g, "\\'")}', '${ex.muscle}')" class="btn-secondary">Seleccionar</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">❌ Error al buscar</div>';
    }
}

function selectExercise(name, muscle) {
    selectedExercise = { name, muscle };
    document.getElementById('selectedExerciseDisplay').style.display = 'block';
    document.getElementById('selectedExerciseName').innerHTML = `<strong>${name}</strong> (${muscleGroups[muscle]?.name || muscle})`;
    document.getElementById('exerciseSearchResults').innerHTML = '';
    document.getElementById('searchExerciseInput').value = '';
}

function clearSelected() {
    selectedExercise = null;
    document.getElementById('selectedExerciseDisplay').style.display = 'none';
}

function addWorkout() {
    if (!selectedExercise) {
        showToast('❌ Primero busca y selecciona un ejercicio', true);
        return;
    }
    
    const weight = parseFloat(document.getElementById('weightInput').value);
    const sets = parseInt(document.getElementById('setsInput').value);
    const reps = parseInt(document.getElementById('repsInput').value);
    
    if (!weight || weight <= 0) {
        showToast('❌ Introduce un peso válido (kg)', true);
        return;
    }
    if (!sets || sets <= 0) {
        showToast('❌ Introduce el número de series', true);
        return;
    }
    if (!reps || reps <= 0) {
        showToast('❌ Introduce el número de repeticiones', true);
        return;
    }
    
    // Calcular volumen y fatiga
    const volume = weight * sets * reps;
    let fatigueGain = Math.min(50, Math.floor(volume / 100));
    if (selectedExercise.muscle === 'cardio') fatigueGain = Math.min(30, Math.floor(volume / 200));
    
    const muscle = muscleMapping[selectedExercise.muscle] || selectedExercise.muscle;
    const targetMuscle = Object.keys(muscleGroups).find(m => m === muscle) || 'chest';
    
    const newFatigue = Math.min(100, (muscleStatus[targetMuscle]?.fatigue || 0) + fatigueGain);
    muscleStatus[targetMuscle] = {
        fatigue: newFatigue,
        lastWorkout: new Date().toISOString(),
        totalVolume: (muscleStatus[targetMuscle]?.totalVolume || 0) + volume
    };
    
    workouts.unshift({
        name: selectedExercise.name,
        muscle: targetMuscle,
        muscleName: muscleGroups[targetMuscle]?.name || targetMuscle,
        weight: weight,
        sets: sets,
        reps: reps,
        volume: volume,
        date: new Date().toISOString(),
        fatigueGain: fatigueGain
    });
    
    // Reducir fatiga de otros músculos (descanso)
    for (let m in muscleStatus) {
        if (m !== targetMuscle && muscleStatus[m].fatigue > 0) {
            muscleStatus[m].fatigue = Math.max(0, muscleStatus[m].fatigue - 3);
        }
    }
    
    saveSports();
    renderMuscleStats();
    renderWorkoutHistory();
    clearSelected();
    document.getElementById('weightInput').value = '';
    document.getElementById('setsInput').value = '';
    document.getElementById('repsInput').value = '';
    showToast(`🏋️ ${selectedExercise.name} registrado! +${fatigueGain}% fatiga (${volume}kg volumen)`);
}

function renderMuscleStats() {
    const container = document.getElementById('muscleStats');
    if (!container) return;
    
    container.innerHTML = Object.entries(muscleGroups).map(([muscle, info]) => {
        const data = muscleStatus[muscle] || { fatigue: 0, totalVolume: 0 };
        const fatigue = data.fatigue || 0;
        let statusColor, statusText;
        if (fatigue >= 70) { statusColor = 'var(--danger)'; statusText = '🔴 Descanso'; }
        else if (fatigue >= 40) { statusColor = 'var(--warning)'; statusText = '🟡 Moderado'; }
        else if (fatigue >= 20) { statusColor = 'var(--info)'; statusText = '🔵 Ligero'; }
        else { statusColor = 'var(--success)'; statusText = '🟢 Listo'; }
        
        return `
            <div style="min-width: 140px; background: rgba(0,0,0,0.3); border-radius: 20px; padding: 15px; text-align: center;">
                <div style="font-size: 1.8rem; font-weight: 700; color: ${statusColor};">${fatigue}%</div>
                <div style="font-size: 0.9rem; margin: 5px 0;">${info.name}</div>
                <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 10px 0;">
                    <div style="width: ${fatigue}%; height: 100%; background: ${statusColor}; border-radius: 10px;"></div>
                </div>
                <small style="color: ${statusColor};">${statusText}</small>
                ${data.lastWorkout ? `<small style="display: block; margin-top: 5px;">📅 ${new Date(data.lastWorkout).toLocaleDateString()}</small>` : ''}
            </div>
        `;
    }).join('');
    
    initDragScroll(container);
}

function initDragScroll(container) {
    let isDown = false, startX, scrollLeft;
    container.style.cursor = 'grab';
    container.style.overflowX = 'auto';
    container.style.scrollbarWidth = 'none';
    container.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - container.offsetLeft; scrollLeft = container.scrollLeft; });
    container.addEventListener('mouseleave', () => { isDown = false; });
    container.addEventListener('mouseup', () => { isDown = false; });
    container.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); container.scrollLeft = scrollLeft - (e.pageX - container.offsetLeft - startX); });
}

function renderWorkoutHistory() {
    const container = document.getElementById('workoutHistory');
    if (!container) return;
    if (workouts.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🏋️ No hay entrenamientos registrados</li>';
        return;
    }
    container.innerHTML = workouts.slice(0, 30).map(w => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
            <div><i class="fas fa-dumbbell" style="color: var(--accent);"></i> <strong>${w.name}</strong><br><small>${w.muscleName} · ${w.weight}kg x ${w.sets} series x ${w.reps} reps · ${w.volume}kg vol</small></div>
            <small>${new Date(w.date).toLocaleString()}</small>
        </li>
    `).join('');
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'sports' && currentPage === 'sports.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    await loadExercises();
    loadSports();
    initDockActive();
    document.getElementById('searchExerciseBtn')?.addEventListener('click', searchExercises);
    document.getElementById('addWorkoutBtn')?.addEventListener('click', addWorkout);
    document.getElementById('clearSelectedBtn')?.addEventListener('click', clearSelected);
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

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

function getMinHoursFromStartTime(dayIndex, startTime) {
    const [sH, sM] = startTime.split(':').map(Number);
    const minExitMinutes = 16 * 60 + 30;
    let workMinutes = minExitMinutes - (sH * 60 + sM);
    const hasLunch = dayIndex !== 4;
    if (hasLunch) workMinutes -= 30;
    return Math.max(0, Math.round((workMinutes / 60) * 10) / 10);
}

// NUEVO ALGORITMO DE REPARTO PROPORCIONAL CORRECTO
function calculateProportionalDistribution() {
    const currentDayIdx = getCurrentDayIndex();
    if (currentDayIdx === -1) return {};
    
    // Calcular horas ya acumuladas (días pasados + hoy)
    let accumulated = 0;
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (let i = 0; i <= currentDayIdx; i++) {
        const dayId = dayNames[i];
        const dayConfig = currentSettings[dayId] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        
        if (dayConfig.isVacation) {
            accumulated += 8;
        } else if (dayConfig.isTelework) {
            accumulated += getFixedTeleworkHours(i);
        } else if (dayConfig.customHours) {
            accumulated += dayConfig.customHours;
        } else if (i < currentDayIdx) {
            accumulated += 8;
        } else if (i === currentDayIdx) {
            // Hoy: sumar horas reales trabajadas
            accumulated += calculateTodayHoursReal();
        }
    }
    
    // Días futuros: calcular horas fijas (teletrabajo, vacaciones, personalizadas)
    let futureFixed = 0;
    const flexibleFutureDays = [];
    
    for (let i = currentDayIdx + 1; i < days.length; i++) {
        const dayId = days[i].id;
        const dayConfig = currentSettings[dayId] || {};
        const startTime = dayConfig.customStartTime || currentSettings.globalStartTime;
        
        if (dayConfig.isVacation) {
            futureFixed += 8;
        } else if (dayConfig.isTelework) {
            futureFixed += getFixedTeleworkHours(i);
        } else if (dayConfig.customHours) {
            futureFixed += dayConfig.customHours;
        } else {
            flexibleFutureDays.push({ dayId: dayId, index: i, startTime: startTime });
        }
    }
    
    const remainingNeeded = 40 - accumulated - futureFixed;
    
    if (flexibleFutureDays.length === 0 || remainingNeeded <= 0) {
        const result = {};
        flexibleFutureDays.forEach(day => {
            result[day.dayId] = getMinHoursFromStartTime(day.index, day.startTime);
        });
        return result;
    }
    
    // Reparto proporcional entre días flexibles futuros
    let hoursPerDay = remainingNeeded / flexibleFutureDays.length;
    const result = {};
    let totalAssigned = 0;
    
    for (const day of flexibleFutureDays) {
        const minHours = getMinHoursFromStartTime(day.index, day.startTime);
        let assigned = Math.max(minHours, hoursPerDay);
        assigned = Math.round(assigned * 10) / 10;
        result[day.dayId] = assigned;
        totalAssigned += assigned;
    }
    
    // Ajuste por redondeo
    const diff = remainingNeeded - totalAssigned;
    if (Math.abs(diff) > 0.01 && flexibleFutureDays.length > 0) {
        result[flexibleFutureDays[0].dayId] += diff;
        result[flexibleFutureDays[0].dayId] = Math.round(result[flexibleFutureDays[0].dayId] * 10) / 10;
    }
    
    return result;
}

function getDayHours(dayId, dayIndex) {
    const dayConfig = currentSettings[dayId];
    const currentDayIdx = getCurrentDayIndex();
    
    if (dayConfig?.isVacation) return 8;
    if (dayConfig?.isTelework) return getFixedTeleworkHours(dayIndex);
    if (dayConfig?.customHours) return dayConfig.customHours;
    
    if (dayIndex < currentDayIdx) return 8;
    
    const distribution = calculateProportionalDistribution();
    if (distribution[dayId]) return distribution[dayId];
    
    const startTime = dayConfig?.customStartTime || currentSettings.globalStartTime;
    return getMinHoursFromStartTime(dayIndex, startTime);
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
    const [startHour, startMin] = startTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    if (currentHour < startHour || (currentHour === startHour && currentMin < startMin)) return 0;
    
    let workedMinutes = (currentHour - startHour) * 60 + (currentMin - startMin);
    const hasLunch = dayIndex !== 4;
    if (hasLunch && workedMinutes > 30) workedMinutes -= 30;
    
    return Math.max(0, workedMinutes / 60);
}

function calculateExitTime(dayId, dayIndex, startTime, hours) {
    if (hours <= 0 || !startTime) return '--:--';
    const [sH, sM] = startTime.split(':').map(Number);
    const hasLunch = dayIndex !== 4;
    let totalMinutes = (sH * 60 + sM) + (hours * 60);
    if (hasLunch) totalMinutes += 30;
    
    const minExitMinutes = 16 * 60 + 30;
    if (totalMinutes < minExitMinutes) totalMinutes = minExitMinutes;
    
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
        } else {
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
        else accumulated += 8;
    }
    accumulated += calculateTodayHoursReal();
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

window.calculateTodayHoursReal = calculateTodayHoursReal;
window.updateSummary = updateSummary;
window.selectExercise = selectExercise;