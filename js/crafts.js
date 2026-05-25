let paintings = [];
let crochetProjects = [];
let recipes = [];

let activeTab = 'paintings';

function loadCrafts() {
    const userData = getUserData();
    if (userData) {
        paintings = userData.paintings || [];
        crochetProjects = userData.crochetProjects || [];
        recipes = userData.recipes || [];
    }
    renderPaintings();
    renderCrochet();
    renderRecipes();
}

function saveCrafts() {
    const userData = getUserData();
    if (userData) {
        userData.paintings = paintings;
        userData.crochetProjects = crochetProjects;
        userData.recipes = recipes;
        saveUserData(userData);
    }
    if (window.updateStats) window.updateStats();
    if (window.updatePreviews) window.updatePreviews();
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

// ==================== PESTAÑAS ====================
function switchTab(tab) {
    activeTab = tab;
    
    document.getElementById('paintingsSection').style.display = tab === 'paintings' ? 'block' : 'none';
    document.getElementById('crochetSection').style.display = tab === 'crochet' ? 'block' : 'none';
    document.getElementById('bakingSection').style.display = tab === 'baking' ? 'block' : 'none';
    
    const tabs = {
        paintings: document.getElementById('tabPaintings'),
        crochet: document.getElementById('tabCrochet'),
        baking: document.getElementById('tabBaking')
    };
    
    for (let [key, btn] of Object.entries(tabs)) {
        if (btn) {
            btn.className = key === tab ? 'btn-primary' : 'btn-secondary';
        }
    }
}

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
    
    document.getElementById('tabPaintings')?.addEventListener('click', () => switchTab('paintings'));
    document.getElementById('tabCrochet')?.addEventListener('click', () => switchTab('crochet'));
    document.getElementById('tabBaking')?.addEventListener('click', () => switchTab('baking'));
    
    document.getElementById('addPaintingBtn')?.addEventListener('click', addPainting);
    document.getElementById('addCrochetBtn')?.addEventListener('click', addCrochet);
    document.getElementById('addRecipeBtn')?.addEventListener('click', addRecipe);
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.deletePainting = deletePainting;
window.deleteCrochet = deleteCrochet;
window.deleteRecipe = deleteRecipe;
window.updateCrochetProgress = updateCrochetProgress;