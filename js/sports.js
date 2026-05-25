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

window.selectExercise = selectExercise;