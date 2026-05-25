let tasks = [];
let taskHistory = {}; // { "2024-01-15": ["taskId1", "taskId2"] }
let showSettings = false;

function loadTasks() {
    const userData = getUserData();
    if (userData) {
        tasks = userData.tasks || [];
        taskHistory = userData.taskHistory || {};
    }
    generateTodayTasks();
    renderView();
    updateProductivity();
}

function saveTasks() {
    const userData = getUserData();
    if (userData) {
        userData.tasks = tasks;
        userData.taskHistory = taskHistory;
        saveUserData(userData);
    }
    if (window.updateStats) window.updateStats();
    if (window.updatePreviews) window.updatePreviews();
}

function renderView() {
    if (showSettings) {
        document.getElementById('mainTasksView').style.display = 'none';
        document.getElementById('settingsView').style.display = 'block';
        renderAllTasks();
    } else {
        document.getElementById('mainTasksView').style.display = 'block';
        document.getElementById('settingsView').style.display = 'none';
        renderTodayTasks();
    }
}

function goToSettings() {
    showSettings = true;
    renderView();
}

function goBackToTasks() {
    showSettings = false;
    renderView();
    updateProductivity();
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

// Verificar si una tarea debe hacerse hoy según su frecuencia
function shouldDoToday(task, lastCompletionDate) {
    if (!task.active) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!lastCompletionDate) return true;
    
    const lastDate = new Date(lastCompletionDate);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    
    switch (task.frequency) {
        case 'daily': return diffDays >= 1;
        case 'every2days': return diffDays >= 2;
        case 'weekly': return diffDays >= 7;
        case 'monthly': return diffDays >= 30;
        default: return true;
    }
}

// Generar lista de tareas para hoy
function generateTodayTasks() {
    const todayKey = getTodayKey();
    const completedToday = taskHistory[todayKey] || [];
    
    const todayTasks = [];
    
    for (const task of tasks) {
        if (!task.active) continue;
        
        // Buscar última vez que se completó esta tarea
        let lastCompleted = null;
        for (let date in taskHistory) {
            if (taskHistory[date].includes(task.id)) {
                if (!lastCompleted || new Date(date) > new Date(lastCompleted)) {
                    lastCompleted = date;
                }
            }
        }
        
        if (shouldDoToday(task, lastCompleted)) {
            const isCompleted = completedToday.includes(task.id);
            todayTasks.push({
                ...task,
                isCompleted: isCompleted,
                lastCompleted: lastCompleted
            });
        }
    }
    
    // Ordenar: no completadas primero
    todayTasks.sort((a, b) => a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1);
    
    return todayTasks;
}

function toggleTask(taskId) {
    const todayKey = getTodayKey();
    if (!taskHistory[todayKey]) {
        taskHistory[todayKey] = [];
    }
    
    const index = taskHistory[todayKey].indexOf(taskId);
    if (index === -1) {
        taskHistory[todayKey].push(taskId);
        showToast('✅ Tarea completada!');
    } else {
        taskHistory[todayKey].splice(index, 1);
        showToast('🔄 Tarea marcada como pendiente');
    }
    
    saveTasks();
    renderTodayTasks();
    renderAllTasks();
    updateProductivity();
    
    // Actualizar widget en home si existe
    if (window.updateHomeStats) window.updateHomeStats();
}

function resetTodayTasks() {
    if (confirm('¿Reiniciar todas las tareas de hoy? Esto las marcará como no completadas.')) {
        const todayKey = getTodayKey();
        taskHistory[todayKey] = [];
        saveTasks();
        renderTodayTasks();
        renderAllTasks();
        updateProductivity();
        showToast('🔄 Tareas de hoy reiniciadas');
    }
}

function addTask() {
    const name = document.getElementById('taskName').value.trim();
    const frequency = document.getElementById('taskFrequency').value;
    const room = document.getElementById('taskRoom').value;
    
    if (!name) {
        showToast('❌ Escribe un nombre para la tarea', true);
        return;
    }
    
    const newTask = {
        id: Date.now(),
        name: name,
        frequency: frequency,
        room: room,
        active: true,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    saveTasks();
    renderAllTasks();
    renderTodayTasks();
    updateProductivity();
    clearTaskForm();
    showToast(`🧹 Tarea "${name}" añadida`);
}

function clearTaskForm() {
    document.getElementById('taskName').value = '';
}

function toggleTaskActive(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.active = !task.active;
        saveTasks();
        renderAllTasks();
        renderTodayTasks();
        updateProductivity();
        showToast(task.active ? '✅ Tarea reactivada' : '⏸️ Tarea pausada');
    }
}

function deleteTask(taskId) {
    if (confirm('¿Eliminar esta tarea permanentemente?')) {
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks.splice(index, 1);
            saveTasks();
            renderAllTasks();
            renderTodayTasks();
            updateProductivity();
            showToast('🗑️ Tarea eliminada');
        }
    }
}

function updateProductivity() {
    const todayTasks = generateTodayTasks();
    const totalToday = todayTasks.length;
    const completedToday = todayTasks.filter(t => t.isCompleted).length;
    const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100;
    
    document.getElementById('todayCompleted').innerText = completedToday;
    document.getElementById('todayPending').innerText = totalToday - completedToday;
    document.getElementById('completionRate').innerText = completionRate;
    document.getElementById('tasksProgress').style.width = completionRate + '%';
    
    const message = document.getElementById('productivityMessage');
    if (totalToday === 0) {
        message.innerHTML = '🎉 ¡No hay tareas pendientes hoy! Disfruta tu día.';
        message.style.color = 'var(--success)';
    } else if (completionRate === 100) {
        message.innerHTML = '✨ ¡Excelente! Has completado todas las tareas del día.';
        message.style.color = 'var(--success)';
    } else if (completionRate >= 50) {
        message.innerHTML = `👍 Vas bien. Te quedan ${totalToday - completedToday} tareas por hacer.`;
        message.style.color = 'var(--accent)';
    } else {
        message.innerHTML = `💪 Ánimo! Te quedan ${totalToday - completedToday} tareas. ¡Puedes con ellas!`;
        message.style.color = 'var(--warning)';
    }
}

function renderTodayTasks() {
    const container = document.getElementById('todayTasksList');
    if (!container) return;
    
    const todayTasks = generateTodayTasks();
    
    if (todayTasks.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🎉 No hay tareas pendientes para hoy</li>';
        return;
    }
    
    const roomIcons = {
        general: '🏠', kitchen: '🍳', bathroom: '🚽', bedroom: '🛏️', living: '🛋️', outside: '🌳'
    };
    
    const frequencyText = {
        daily: 'Diaria', every2days: 'Cada 2 días', weekly: 'Semanal', monthly: 'Mensual'
    };
    
    container.innerHTML = todayTasks.map(task => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border); ${task.isCompleted ? 'opacity: 0.6;' : ''}">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${task.isCompleted ? 'fa-check-circle' : 'fa-circle'}" 
                   style="color: ${task.isCompleted ? 'var(--success)' : 'var(--accent)'}; cursor: pointer; font-size: 1.3rem;"
                   onclick="toggleTask(${task.id})"></i>
                <div>
                    <strong style="${task.isCompleted ? 'text-decoration: line-through;' : ''}">${escapeHtml(task.name)}</strong>
                    <small style="display: block; color: var(--text-secondary);">
                        ${roomIcons[task.room]} ${frequencyText[task.frequency]}
                        ${task.lastCompleted ? ` · Última vez: ${new Date(task.lastCompleted).toLocaleDateString()}` : ''}
                    </small>
                </div>
            </div>
        </li>
    `).join('');
}

function renderAllTasks() {
    const container = document.getElementById('allTasksList');
    if (!container) return;
    
    if (tasks.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🧹 No hay tareas creadas</li>';
        return;
    }
    
    const frequencyText = {
        daily: '📅 Diaria', every2days: '🔄 Cada 2 días', weekly: '📆 Semanal', monthly: '📅 Mensual'
    };
    
    const roomText = {
        general: '🏠 General', kitchen: '🍳 Cocina', bathroom: '🚽 Baño', bedroom: '🛏️ Dormitorio', living: '🛋️ Salón', outside: '🌳 Exterior'
    };
    
    container.innerHTML = tasks.map(task => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
            <div>
                <i class="fas ${task.active ? 'fa-toggle-on' : 'fa-toggle-off'}" 
                   style="color: ${task.active ? 'var(--success)' : 'var(--text-secondary)'}; cursor: pointer; margin-right: 10px;"
                   onclick="toggleTaskActive(${task.id})"></i>
                <strong style="${!task.active ? 'opacity: 0.5;' : ''}">${escapeHtml(task.name)}</strong>
                <small style="display: block; color: var(--text-secondary);">
                    ${frequencyText[task.frequency]} · ${roomText[task.room]}
                </small>
            </div>
            <button onclick="deleteTask(${task.id})" class="btn-danger"><i class="fas fa-trash"></i></button>
        </li>
    `).join('');
}

function getTodayCompletionRate() {
    const todayTasks = generateTodayTasks();
    const totalToday = todayTasks.length;
    if (totalToday === 0) return 100;
    const completedToday = todayTasks.filter(t => t.isCompleted).length;
    return Math.round((completedToday / totalToday) * 100);
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'tasks' && currentPage === 'tasks.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    loadTasks();
    initDockActive();
    document.getElementById('addTaskBtn')?.addEventListener('click', addTask);
    document.getElementById('resetTodayTasksBtn')?.addEventListener('click', resetTodayTasks);
    document.getElementById('goToSettingsBtn')?.addEventListener('click', goToSettings);
    document.getElementById('backToTasksBtn')?.addEventListener('click', goBackToTasks);
    document.getElementById('taskName')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.toggleTask = toggleTask;
window.toggleTaskActive = toggleTaskActive;
window.deleteTask = deleteTask;
window.getTodayCompletionRate = getTodayCompletionRate;
window.goToSettings = goToSettings;
window.goBackToTasks = goBackToTasks;