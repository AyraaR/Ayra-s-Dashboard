let paintings = [];
let crochetProjects = [];
let recipes = [];
let chores = [];

let activeTab = 'paintings';

function loadCrafts() {
    const userData = getUserData();
    if (userData) {
        paintings = userData.paintings || [];
        crochetProjects = userData.crochetProjects || [];
        recipes = userData.recipes || [];
        chores = userData.chores || [];
    }
    renderPaintings();
    renderCrochet();
    renderRecipes();
    renderChores();
}

function saveCrafts() {
    const userData = getUserData();
    if (userData) {
        userData.paintings = paintings;
        userData.crochetProjects = crochetProjects;
        userData.recipes = recipes;
        userData.chores = chores;
        saveUserData(userData);
    }
    if (window.updateStats) window.updateStats();
}

// ==================== CUADROS ====================
function addPainting() {
    const title = document.getElementById('paintingTitle').value.trim();
    const technique = document.getElementById('paintingTechnique').value.trim();
    const date = document.getElementById('paintingDate').value;
    
    if (!title) {
        showToast('❌ Introduce un título', true);
        return;
    }
    
    paintings.unshift({
        id: Date.now(),
        title: title,
        technique: technique || 'Sin especificar',
        date: date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    });
    
    saveCrafts();
    renderPaintings();
    clearPaintingForm();
    showToast(`🎨 Cuadro "${title}" añadido`);
}

function clearPaintingForm() {
    document.getElementById('paintingTitle').value = '';
    document.getElementById('paintingTechnique').value = '';
    document.getElementById('paintingDate').value = '';
}

function deletePainting(index) {
    if (confirm('¿Eliminar este cuadro?')) {
        paintings.splice(index, 1);
        saveCrafts();
        renderPaintings();
        showToast('🗑️ Cuadro eliminado');
    }
}

function renderPaintings() {
    const container = document.getElementById('paintingsList');
    if (!container) return;
    
    if (paintings.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🎨 No hay cuadros registrados</li>';
        return;
    }
    
    container.innerHTML = paintings.map((painting, idx) => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
            <div>
                <i class="fas fa-palette" style="color: var(--accent);"></i>
                <strong>${escapeHtml(painting.title)}</strong><br>
                <small>${escapeHtml(painting.technique)} · 📅 ${painting.date}</small>
            </div>
            <button onclick="deletePainting(${idx})" class="btn-danger"><i class="fas fa-trash"></i></button>
        </li>
    `).join('');
}

// ==================== GANCHILLO ====================
function addCrochet() {
    const name = document.getElementById('crochetName').value.trim();
    const yarn = document.getElementById('crochetYarn').value.trim();
    let progress = parseInt(document.getElementById('crochetProgress').value);
    
    if (!name) {
        showToast('❌ Introduce un nombre para el proyecto', true);
        return;
    }
    if (isNaN(progress)) progress = 0;
    progress = Math.min(100, Math.max(0, progress));
    
    crochetProjects.unshift({
        id: Date.now(),
        name: name,
        yarn: yarn || 'Sin especificar',
        progress: progress,
        createdAt: new Date().toISOString()
    });
    
    saveCrafts();
    renderCrochet();
    clearCrochetForm();
    showToast(`🧶 Proyecto "${name}" añadido`);
}

function clearCrochetForm() {
    document.getElementById('crochetName').value = '';
    document.getElementById('crochetYarn').value = '';
    document.getElementById('crochetProgress').value = '';
}

function updateCrochetProgress(index, newProgress) {
    crochetProjects[index].progress = Math.min(100, Math.max(0, newProgress));
    saveCrafts();
    renderCrochet();
    showToast(`📊 Progreso actualizado a ${crochetProjects[index].progress}%`);
}

function deleteCrochet(index) {
    if (confirm('¿Eliminar este proyecto?')) {
        crochetProjects.splice(index, 1);
        saveCrafts();
        renderCrochet();
        showToast('🗑️ Proyecto eliminado');
    }
}

function renderCrochet() {
    const container = document.getElementById('crochetList');
    if (!container) return;
    
    if (crochetProjects.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🧶 No hay proyectos de ganchillo</li>';
        return;
    }
    
    container.innerHTML = crochetProjects.map((project, idx) => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border); flex-wrap: wrap; gap: 10px;">
            <div style="flex: 2;">
                <i class="fas fa-tshirt" style="color: var(--accent);"></i>
                <strong>${escapeHtml(project.name)}</strong><br>
                <small>${escapeHtml(project.yarn)}</small>
            </div>
            <div style="flex: 1; min-width: 150px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${project.progress}%</span>
                    <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                        <div style="width: ${project.progress}%; height: 100%; background: var(--accent); border-radius: 10px;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <button onclick="updateCrochetProgress(${idx}, ${project.progress - 10})" class="btn-secondary" style="padding: 2px 8px;">-10%</button>
                    <button onclick="updateCrochetProgress(${idx}, ${project.progress + 10})" class="btn-secondary" style="padding: 2px 8px;">+10%</button>
                </div>
            </div>
            <button onclick="deleteCrochet(${idx})" class="btn-danger"><i class="fas fa-trash"></i></button>
        </li>
    `).join('');
}

// ==================== REPOSTERÍA ====================
function addRecipe() {
    const name = document.getElementById('recipeName').value.trim();
    const ingredients = document.getElementById('recipeIngredients').value.trim();
    const difficulty = document.getElementById('recipeDifficulty').value;
    
    if (!name) {
        showToast('❌ Introduce un nombre para la receta', true);
        return;
    }
    
    recipes.unshift({
        id: Date.now(),
        name: name,
        ingredients: ingredients || 'Sin ingredientes especificados',
        difficulty: difficulty,
        createdAt: new Date().toISOString()
    });
    
    saveCrafts();
    renderRecipes();
    clearRecipeForm();
    showToast(`🍰 Receta "${name}" añadida`);
}

function clearRecipeForm() {
    document.getElementById('recipeName').value = '';
    document.getElementById('recipeIngredients').value = '';
}

function deleteRecipe(index) {
    if (confirm('¿Eliminar esta receta?')) {
        recipes.splice(index, 1);
        saveCrafts();
        renderRecipes();
        showToast('🗑️ Receta eliminada');
    }
}

function renderRecipes() {
    const container = document.getElementById('recipesList');
    if (!container) return;
    
    if (recipes.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🍰 No hay recetas registradas</li>';
        return;
    }
    
    const difficultyIcon = {
        'fácil': '🍰',
        'medio': '🍪',
        'difícil': '🎂'
    };
    
    container.innerHTML = recipes.map((recipe, idx) => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
            <div>
                <i class="fas fa-cake-candles" style="color: var(--accent);"></i>
                <strong>${escapeHtml(recipe.name)}</strong><br>
                <small>${difficultyIcon[recipe.difficulty]} ${escapeHtml(recipe.difficulty)} · ${escapeHtml(recipe.ingredients.substring(0, 50))}${recipe.ingredients.length > 50 ? '...' : ''}</small>
            </div>
            <button onclick="deleteRecipe(${idx})" class="btn-danger"><i class="fas fa-trash"></i></button>
        </li>
    `).join('');
}

// ==================== TAREAS CASA ====================
function addChore() {
    const name = document.getElementById('choreName').value.trim();
    const frequency = document.getElementById('choreFrequency').value;
    
    if (!name) {
        showToast('❌ Introduce una tarea', true);
        return;
    }
    
    chores.unshift({
        id: Date.now(),
        name: name,
        frequency: frequency,
        completed: false,
        lastCompleted: null,
        createdAt: new Date().toISOString()
    });
    
    saveCrafts();
    renderChores();
    clearChoreForm();
    showToast(`🧹 Tarea "${name}" añadida`);
}

function clearChoreForm() {
    document.getElementById('choreName').value = '';
}

function toggleChoreComplete(index) {
    chores[index].completed = !chores[index].completed;
    if (chores[index].completed) {
        chores[index].lastCompleted = new Date().toISOString();
    }
    saveCrafts();
    renderChores();
    
    if (chores[index].completed) {
        showToast(`✅ ${chores[index].name} completada!`);
    }
}

function deleteChore(index) {
    if (confirm('¿Eliminar esta tarea?')) {
        chores.splice(index, 1);
        saveCrafts();
        renderChores();
        showToast('🗑️ Tarea eliminada');
    }
}

function renderChores() {
    const container = document.getElementById('choresList');
    if (!container) return;
    
    const frequencyIcon = {
        'daily': '📅 Diaria',
        'weekly': '📆 Semanal',
        'monthly': '📅 Mensual'
    };
    
    const pendingChores = chores.filter(c => !c.completed);
    const completedChores = chores.filter(c => c.completed);
    
    if (chores.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 30px;">🧹 No hay tareas pendientes</li>';
        return;
    }
    
    let html = '<h3 style="margin: 10px 0;">📋 Pendientes</h3>';
    if (pendingChores.length === 0) {
        html += '<li style="text-align: center; padding: 10px;">✨ ¡Todas las tareas completadas!</li>';
    } else {
        html += pendingChores.map((chore, originalIdx) => {
            const idx = chores.findIndex(c => c.id === chore.id);
            return `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="far fa-circle" style="color: var(--accent); cursor: pointer;" onclick="toggleChoreComplete(${idx})"></i>
                        <div>
                            <strong>${escapeHtml(chore.name)}</strong>
                            <small style="display: block;">${frequencyIcon[chore.frequency]}</small>
                        </div>
                    </div>
                    <button onclick="deleteChore(${idx})" class="btn-danger"><i class="fas fa-trash"></i></button>
                </li>
            `;
        }).join('');
    }
    
    html += '<h3 style="margin: 20px 0 10px 0;">✅ Completadas recientemente</h3>';
    if (completedChores.length === 0) {
        html += '<li style="text-align: center; padding: 10px;">No hay tareas completadas aún</li>';
    } else {
        html += completedChores.slice(0, 10).map(chore => {
            const idx = chores.findIndex(c => c.id === chore.id);
            return `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border); opacity: 0.7;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-check-circle" style="color: var(--success);"></i>
                        <div>
                            <strong>${escapeHtml(chore.name)}</strong>
                            <small style="display: block;">${chore.lastCompleted ? new Date(chore.lastCompleted).toLocaleDateString() : ''}</small>
                        </div>
                    </div>
                    <button onclick="deleteChore(${idx})" class="btn-danger"><i class="fas fa-trash"></i></button>
                </li>
            `;
        }).join('');
    }
    
    container.innerHTML = html;
}

// ==================== PESTAÑAS ====================
function switchTab(tab) {
    activeTab = tab;
    
    document.getElementById('paintingsSection').style.display = tab === 'paintings' ? 'block' : 'none';
    document.getElementById('crochetSection').style.display = tab === 'crochet' ? 'block' : 'none';
    document.getElementById('bakingSection').style.display = tab === 'baking' ? 'block' : 'none';
    document.getElementById('choresSection').style.display = tab === 'chores' ? 'block' : 'none';
    
    const tabs = {
        paintings: document.getElementById('tabPaintings'),
        crochet: document.getElementById('tabCrochet'),
        baking: document.getElementById('tabBaking'),
        chores: document.getElementById('TabChores')
    };
    
    for (let [key, btn] of Object.entries(tabs)) {
        if (btn) {
            btn.className = key === tab ? 'btn-primary' : 'btn-secondary';
        }
    }
}

// ==================== SPOTIFY (opcional) ====================
// Spotify API necesita autenticación OAuth
// Para usarla gratis tendrías que:
// 1. Registrarte en developer.spotify.com
// 2. Crear una app y obtener Client ID
// 3. Implementar OAuth flow
// Por ahora mostramos un placeholder

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'crafts' && currentPage === 'crafts.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    loadCrafts();
    initDockActive();
    
    // Botones tabs
    document.getElementById('tabPaintings')?.addEventListener('click', () => switchTab('paintings'));
    document.getElementById('tabCrochet')?.addEventListener('click', () => switchTab('crochet'));
    document.getElementById('tabBaking')?.addEventListener('click', () => switchTab('baking'));
    document.getElementById('TabChores')?.addEventListener('click', () => switchTab('chores'));
    
    // Botones añadir
    document.getElementById('addPaintingBtn')?.addEventListener('click', addPainting);
    document.getElementById('addCrochetBtn')?.addEventListener('click', addCrochet);
    document.getElementById('addRecipeBtn')?.addEventListener('click', addRecipe);
    document.getElementById('addChoreBtn')?.addEventListener('click', addChore);
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.deletePainting = deletePainting;
window.deleteCrochet = deleteCrochet;
window.deleteRecipe = deleteRecipe;
window.deleteChore = deleteChore;
window.updateCrochetProgress = updateCrochetProgress;
window.toggleChoreComplete = toggleChoreComplete;