let workouts = [];
let muscleStatus = {
    pecho: { fatigue: 0, lastWorkout: null },
    espalda: { fatigue: 0, lastWorkout: null },
    piernas: { fatigue: 0, lastWorkout: null },
    hombros: { fatigue: 0, lastWorkout: null },
    biceps: { fatigue: 0, lastWorkout: null },
    triceps: { fatigue: 0, lastWorkout: null },
    core: { fatigue: 0, lastWorkout: null },
    cardio: { fatigue: 0, lastWorkout: null }
};

const muscleNames = {
    pecho: 'Pecho',
    espalda: 'Espalda',
    piernas: 'Piernas',
    hombros: 'Hombros',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    core: 'Core',
    cardio: 'Cardio'
};

function loadSports() {
    const userData = getUserData();
    if (userData) {
        workouts = userData.workouts || [];
        muscleStatus = userData.muscleStatus || muscleStatus;
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
}

function addWorkout() {
    const exercise = document.getElementById('exerciseSelect').value;
    const intensity = document.getElementById('intensitySelect').value;
    
    const intensityMultiplier = intensity === 'bajo' ? 1 : intensity === 'medio' ? 2 : 3;
    const fatigueGain = intensityMultiplier * 15; // 15%, 30%, 45%
    
    const newFatigue = Math.min(100, (muscleStatus[exercise].fatigue || 0) + fatigueGain);
    muscleStatus[exercise] = {
        fatigue: newFatigue,
        lastWorkout: new Date().toISOString()
    };
    
    workouts.unshift({
        muscle: exercise,
        muscleName: muscleNames[exercise],
        intensity: intensity,
        date: new Date().toISOString(),
        fatigueGain: fatigueGain
    });
    
    // Reducir fatiga de otros músculos (descanso natural)
    for (let m in muscleStatus) {
        if (m !== exercise && muscleStatus[m].fatigue > 0) {
            muscleStatus[m].fatigue = Math.max(0, muscleStatus[m].fatigue - 5);
        }
    }
    
    saveSports();
    renderMuscleStats();
    renderWorkoutHistory();
    showToast(`🏋️ ${muscleNames[exercise]} registrado! +${fatigueGain}% fatiga`);
}

function renderMuscleStats() {
    const container = document.getElementById('muscleStats');
    if (!container) return;
    
    container.innerHTML = Object.entries(muscleStatus).map(([muscle, data]) => {
        const fatigue = data.fatigue || 0;
        let statusColor = '';
        let statusText = '';
        if (fatigue >= 70) {
            statusColor = 'var(--danger)';
            statusText = '🔴 Descanso necesario';
        } else if (fatigue >= 40) {
            statusColor = 'var(--warning)';
            statusText = '🟡 Moderado';
        } else {
            statusColor = 'var(--success)';
            statusText = '🟢 Listo para entrenar';
        }
        
        return `
            <div class="stat-card">
                <div class="stat-number" style="color: ${statusColor}; font-size: 1.5rem;">${fatigue}%</div>
                <div class="stat-label">${muscleNames[muscle]}</div>
                <div class="stat-progress" style="margin-top: 10px;"><div class="stat-progress-fill" style="width: ${fatigue}%; background: ${statusColor};"></div></div>
                <small style="color: ${statusColor};">${statusText}</small>
                ${data.lastWorkout ? `<small style="display: block; margin-top: 5px;">📅 ${new Date(data.lastWorkout).toLocaleDateString()}</small>` : ''}
            </div>
        `;
    }).join('');
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
                        <strong>${workout.muscleName}</strong>
                        <small style="display: block; color: var(--text-secondary);">${intensityIcon} ${workout.intensity} intensidad</small>
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
    loadSports();
    initDockActive();
    document.getElementById('addWorkoutBtn')?.addEventListener('click', addWorkout);
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});