// API Ninjas Configuration
const EXERCISES_API_KEY = 'yrGkZh6ydpc3x2RUeCoDBJeSiVuSknITrE07AWBq';
const EXERCISES_API_URL = 'https://api.api-ninjas.com/v1/exercises';

let workouts = [];
let muscleStatus = {};
let availableExercises = [];

// Mapeo de grupos musculares según la API
const muscleGroups = {
    'abdominals': { name: 'Abdominales', color: 'var(--accent)' },
    'abductors': { name: 'Abductores', color: 'var(--accent)' },
    'adductors': { name: 'Aductores', color: 'var(--accent)' },
    'biceps': { name: 'Bíceps', color: 'var(--accent)' },
    'calves': { name: 'Gemelos', color: 'var(--accent)' },
    'chest': { name: 'Pecho', color: 'var(--accent)' },
    'forearms': { name: 'Antebrazos', color: 'var(--accent)' },
    'glutes': { name: 'Glúteos', color: 'var(--accent)' },
    'hamstrings': { name: 'Isquiotibiales', color: 'var(--accent)' },
    'lats': { name: 'Dorsales', color: 'var(--accent)' },
    'lower_back': { name: 'Lumbar', color: 'var(--accent)' },
    'middle_back': { name: 'Espalda Media', color: 'var(--accent)' },
    'neck': { name: 'Cuello', color: 'var(--accent)' },
    'quadriceps': { name: 'Cuádriceps', color: 'var(--accent)' },
    'traps': { name: 'Trapecios', color: 'var(--accent)' },
    'triceps': { name: 'Tríceps', color: 'var(--accent)' },
    'cardio': { name: 'Cardio', color: 'var(--accent)' }
};

// Músculos principales para mostrar en el dashboard (resumen)
const mainMuscles = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'cardio'
];

const mainMuscleMapping = {
    'chest': ['chest'],
    'back': ['lats', 'middle_back', 'traps'],
    'shoulders': ['shoulders', 'traps'],
    'biceps': ['biceps'],
    'triceps': ['triceps'],
    'legs': ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors'],
    'core': ['abdominals', 'lower_back'],
    'cardio': ['cardio']
};

async function loadExercises() {
    const select = document.getElementById('exerciseSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Cargando ejercicios...</option>';
    
    try {
        // Cargar ejercicios de diferentes grupos musculares principales
        const muscleTypes = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'cardio'];
        let allExercises = [];
        
        for (const muscle of muscleTypes) {
            const response = await fetch(`${EXERCISES_API_URL}?muscle=${muscle}&limit=10`, {
                headers: { 'X-Api-Key': EXERCISES_API_KEY }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                allExercises = [...allExercises, ...data];
            }
        }
        
        // Eliminar duplicados por nombre
        const uniqueExercises = [];
        const exerciseNames = new Set();
        for (const ex of allExercises) {
            if (!exerciseNames.has(ex.name.toLowerCase())) {
                exerciseNames.add(ex.name.toLowerCase());
                uniqueExercises.push(ex);
            }
        }
        
        availableExercises = uniqueExercises;
        
        if (availableExercises.length === 0) {
            // Fallback a ejercicios predefinidos
            loadFallbackExercises();
        } else {
            select.innerHTML = availableExercises.map(ex => 
                `<option value="${ex.muscle}">${ex.name} (${muscleGroups[ex.muscle]?.name || ex.muscle})</option>`
            ).join('');
        }
        
        // Inicializar muscleStatus para los grupos que aparecen
        for (const ex of availableExercises) {
            if (ex.muscle && !muscleStatus[ex.muscle]) {
                muscleStatus[ex.muscle] = { fatigue: 0, lastWorkout: null };
            }
        }
        
    } catch (error) {
        console.error('Error loading exercises from API:', error);
        loadFallbackExercises();
    }
}

function loadFallbackExercises() {
    const fallbackExercises = [
        { name: 'Press banca', muscle: 'chest' },
        { name: 'Flexiones', muscle: 'chest' },
        { name: 'Dominadas', muscle: 'lats' },
        { name: 'Remo con barra', muscle: 'middle_back' },
        { name: 'Sentadillas', muscle: 'quadriceps' },
        { name: 'Peso muerto', muscle: 'hamstrings' },
        { name: 'Press militar', muscle: 'shoulders' },
        { name: 'Curl bíceps', muscle: 'biceps' },
        { name: 'Fondos', muscle: 'triceps' },
        { name: 'Plancha', muscle: 'abdominals' },
        { name: 'Elevación de piernas', muscle: 'abdominals' },
        { name: 'Correr', muscle: 'cardio' },
        { name: 'Natación', muscle: 'cardio' }
    ];
    availableExercises = fallbackExercises;
    const select = document.getElementById('exerciseSelect');
    if (select) {
        select.innerHTML = availableExercises.map(ex => 
            `<option value="${ex.muscle}">${ex.name} (${muscleGroups[ex.muscle]?.name || ex.muscle})</option>`
        ).join('');
    }
}

function loadSports() {
    const userData = getUserData();
    if (userData) {
        workouts = userData.workouts || [];
        muscleStatus = userData.muscleStatus || {};
    }
    // Inicializar muscleStatus para grupos principales
    for (let muscle in muscleGroups) {
        if (!muscleStatus[muscle]) {
            muscleStatus[muscle] = { fatigue: 0, lastWorkout: null };
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

function addWorkout() {
    const select = document.getElementById('exerciseSelect');
    const muscle = select.value;
    const intensity = document.getElementById('intensitySelect').value;
    
    if (!muscle) {
        showToast('❌ Selecciona un ejercicio', true);
        return;
    }
    
    const exerciseName = availableExercises.find(ex => ex.muscle === muscle)?.name || muscle;
    
    // Calcular fatiga según intensidad
    const intensityMultiplier = intensity === 'bajo' ? 1 : intensity === 'medio' ? 2 : 3;
    let fatigueGain = intensityMultiplier * 15;
    
    // Ajuste por tipo de ejercicio
    if (muscle === 'cardio') {
        fatigueGain = Math.round(fatigueGain * 0.7); // Cardio fatiga menos
    } else if (muscle.includes('back') || muscle === 'legs') {
        fatigueGain = Math.round(fatigueGain * 1.2); // Músculos grandes fatigan más
    }
    
    // Aplicar fatiga al músculo específico
    const newFatigue = Math.min(100, (muscleStatus[muscle]?.fatigue || 0) + fatigueGain);
    muscleStatus[muscle] = {
        fatigue: newFatigue,
        lastWorkout: new Date().toISOString()
    };
    
    // Fatiga a músculos sinérgicos
    const synergisticMuscles = getSynergisticMuscles(muscle);
    for (const synMuscle of synergisticMuscles) {
        if (muscleStatus[synMuscle] && synMuscle !== muscle) {
            const synFatigue = Math.min(100, (muscleStatus[synMuscle].fatigue || 0) + Math.round(fatigueGain * 0.3));
            muscleStatus[synMuscle] = {
                fatigue: synFatigue,
                lastWorkout: muscleStatus[synMuscle].lastWorkout
            };
        }
    }
    
    // Registrar entrenamiento
    workouts.unshift({
        muscle: muscle,
        muscleName: muscleGroups[muscle]?.name || muscle,
        exerciseName: exerciseName,
        intensity: intensity,
        date: new Date().toISOString(),
        fatigueGain: fatigueGain
    });
    
    // Reducir fatiga de todos los músculos (descanso natural)
    for (let m in muscleStatus) {
        if (muscleStatus[m].fatigue > 0) {
            const reduction = Math.max(2, Math.floor(muscleStatus[m].fatigue * 0.05));
            muscleStatus[m].fatigue = Math.max(0, muscleStatus[m].fatigue - reduction);
        }
    }
    
    saveSports();
    renderMuscleStats();
    renderWorkoutHistory();
    showToast(`🏋️ ${exerciseName} registrado! +${fatigueGain}% fatiga en ${muscleGroups[muscle]?.name || muscle}`);
}

function getSynergisticMuscles(muscle) {
    const synergies = {
        'chest': ['shoulders', 'triceps'],
        'shoulders': ['chest', 'triceps'],
        'triceps': ['chest', 'shoulders'],
        'biceps': ['back'],
        'back': ['biceps', 'shoulders'],
        'legs': ['glutes', 'hamstrings', 'quadriceps'],
        'quadriceps': ['glutes', 'hamstrings'],
        'hamstrings': ['glutes', 'quadriceps'],
        'glutes': ['hamstrings', 'quadriceps'],
        'core': ['lower_back'],
        'lower_back': ['core']
    };
    return synergies[muscle] || [];
}

function getMainMuscleFatigue() {
    const result = {};
    for (const main of mainMuscles) {
        const relatedMuscles = mainMuscleMapping[main] || [main];
        let maxFatigue = 0;
        let lastDate = null;
        
        for (const rel of relatedMuscles) {
            const status = muscleStatus[rel];
            if (status) {
                maxFatigue = Math.max(maxFatigue, status.fatigue);
                if (status.lastWorkout && (!lastDate || new Date(status.lastWorkout) > new Date(lastDate))) {
                    lastDate = status.lastWorkout;
                }
            }
        }
        result[main] = { fatigue: maxFatigue, lastWorkout: lastDate };
    }
    return result;
}

function renderMuscleStats() {
    const container = document.getElementById('muscleStats');
    if (!container) return;
    
    const mainMuscleStatus = getMainMuscleFatigue();
    const muscleNames = {
        'chest': 'Pecho',
        'back': 'Espalda',
        'shoulders': 'Hombros',
        'biceps': 'Bíceps',
        'triceps': 'Tríceps',
        'legs': 'Piernas',
        'core': 'Core',
        'cardio': 'Cardio'
    };
    
    container.innerHTML = Object.entries(mainMuscleStatus).map(([muscle, data]) => {
        const fatigue = data.fatigue || 0;
        let statusColor = '';
        let statusText = '';
        if (fatigue >= 70) {
            statusColor = 'var(--danger)';
            statusText = '🔴 Descanso necesario';
        } else if (fatigue >= 40) {
            statusColor = 'var(--warning)';
            statusText = '🟡 Moderado';
        } else if (fatigue >= 20) {
            statusColor = 'var(--info)';
            statusText = '🔵 Ligero';
        } else {
            statusColor = 'var(--success)';
            statusText = '🟢 Listo';
        }
        
        return `
            <div class="muscle-card" style="min-width: 140px; background: rgba(0,0,0,0.3); border-radius: 20px; padding: 15px; text-align: center; cursor: grab; user-select: none;">
                <div style="font-size: 1.8rem; font-weight: 700; color: ${statusColor};">${fatigue}%</div>
                <div style="font-size: 0.9rem; margin: 5px 0;">${muscleNames[muscle]}</div>
                <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 10px 0;">
                    <div style="width: ${fatigue}%; height: 100%; background: ${statusColor}; border-radius: 10px;"></div>
                </div>
                <small style="color: ${statusColor};">${statusText}</small>
                ${data.lastWorkout ? `<small style="display: block; margin-top: 5px; font-size: 0.65rem;">📅 ${new Date(data.lastWorkout).toLocaleDateString()}</small>` : ''}
            </div>
        `;
    }).join('');
    
    initDragScroll(container);
}

function initDragScroll(container) {
    if (!container) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    
    container.style.cursor = 'grab';
    container.style.overflowX = 'auto';
    container.style.scrollbarWidth = 'none';
    container.style.msOverflowStyle = 'none';
    
    const style = document.createElement('style');
    style.textContent = `#muscleStats::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(style);
    
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.muscle-card')) return;
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    
    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mouseup', () => {
        isDown = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1.5;
        container.scrollLeft = scrollLeft - walk;
    });
}

function renderWorkoutHistory() {
    const container = document.getElementById('workoutHistory');
    if (!container) return;
    
    if (workouts.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🏋️ No hay entrenamientos registrados</li>';
        return;
    }
    
    container.innerHTML = workouts.slice(0, 20).map(workout => {
        const intensityIcon = workout.intensity === 'bajo' ? '🟢' : workout.intensity === 'medio' ? '🟡' : '🔴';
        return `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-dumbbell" style="color: var(--accent);"></i>
                    <div>
                        <strong>${workout.exerciseName || workout.muscleName}</strong>
                        <small style="display: block; color: var(--text-secondary);">${intensityIcon} ${workout.intensity} intensidad · ${workout.muscleName}</small>
                    </div>
                </div>
                <small>${new Date(workout.date).toLocaleString()}</small>
            </li>
        `;
    }).join('');
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'sports' && currentPage === 'sports.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    loadExercises();
    loadSports();
    initDockActive();
    document.getElementById('addWorkoutBtn')?.addEventListener('click', addWorkout);
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
    
    // Actualizar fatiga cada hora (descanso progresivo)
    setInterval(() => {
        let changed = false;
        for (let m in muscleStatus) {
            if (muscleStatus[m].fatigue > 0) {
                const reduction = Math.max(1, Math.floor(muscleStatus[m].fatigue * 0.03));
                muscleStatus[m].fatigue = Math.max(0, muscleStatus[m].fatigue - reduction);
                changed = true;
            }
        }
        if (changed) {
            saveSports();
            renderMuscleStats();
        }
    }, 3600000); // Cada hora
});