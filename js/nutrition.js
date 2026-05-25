let foodEntries = [];
let nutritionGoal = { currentWeight: 0, goalWeight: 0, targetCalories: 1800, activityLevel: 'moderate' };

function loadNutrition() {
    const userData = getUserData();
    if (userData) {
        foodEntries = userData.foodEntries || [];
        nutritionGoal = userData.nutritionGoal || { currentWeight: 0, goalWeight: 0, targetCalories: 1800, activityLevel: 'moderate' };
    }
    calculateRecommendedCalories();
    renderNutrition();
}

function saveNutrition() {
    const userData = getUserData();
    if (userData) {
        userData.foodEntries = foodEntries;
        userData.nutritionGoal = nutritionGoal;
        saveUserData(userData);
    }
}

// Calcular TMB (Harris-Benedict para mujer)
function calculateBMR(weight, age = 30, height = 165) {
    // 655.1 + (9.563 × peso en kg) + (1.85 × altura en cm) - (4.676 × edad en años)
    return Math.round(655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age));
}

// Calcular calorías quemadas por entrenamiento
function calculateCaloriesBurned(workout) {
    // Estimación basada en volumen (kg * series * reps)
    const volume = workout.weight * workout.sets * workout.reps;
    if (workout.muscle === 'cardio') {
        return Math.round(volume * 0.3);
    }
    return Math.round(volume * 0.2);
}

function calculateRecommendedCalories() {
    const weight = nutritionGoal.currentWeight;
    if (!weight || weight <= 0) return;
    
    const bmr = calculateBMR(weight);
    let tdee = bmr;
    
    // Multiplicador por actividad
    const activityMultipliers = {
        sedentary: 1.2,   // poco o nada de ejercicio
        light: 1.375,     // ejercicio ligero 1-3 días/semana
        moderate: 1.55,   // ejercicio moderado 3-5 días/semana
        active: 1.725,    // ejercicio intenso 6-7 días/semana
        very_active: 1.9  // ejercicio muy intenso + trabajo físico
    };
    
    tdee = Math.round(bmr * (activityMultipliers[nutritionGoal.activityLevel] || 1.55));
    
    // Déficit para perder peso (500 kcal/día = 0.5kg/semana)
    const deficit = 500;
    const recommendedDeficit = Math.max(1200, tdee - deficit);
    
    nutritionGoal.tdee = tdee;
    nutritionGoal.recommendedCalories = recommendedDeficit;
    
    const goalInfo = document.getElementById('goalInfo');
    if (goalInfo) {
        goalInfo.innerHTML = `
            📊 TMB: ${bmr} kcal | Gasto diario: ${tdee} kcal<br>
            🎯 Para déficit (perder 0.5kg/semana): ${recommendedDeficit} kcal/día<br>
            ⚠️ No bajar de 1200 kcal sin supervisión médica
        `;
    }
    
    return recommendedDeficit;
}

function getTodayCaloriesBurned() {
    const userData = getUserData();
    if (!userData) return 0;
    const workouts = userData.workouts || [];
    const today = new Date().toDateString();
    const todayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === today);
    return todayWorkouts.reduce((sum, w) => sum + calculateCaloriesBurned(w), 0);
}

function addFood() {
    const name = document.getElementById('foodName').value.trim();
    const calories = parseFloat(document.getElementById('foodCalories').value);
    const protein = parseFloat(document.getElementById('foodProtein').value) || 0;
    const carbs = parseFloat(document.getElementById('foodCarbs').value) || 0;
    const fat = parseFloat(document.getElementById('foodFat').value) || 0;
    
    if (!name || !calories) {
        showToast('❌ Introduce nombre y calorías', true);
        return;
    }
    
    foodEntries.unshift({
        name: name,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        date: new Date().toISOString()
    });
    
    saveNutrition();
    renderNutrition();
    clearFoodForm();
    showToast(`🍎 Añadido: ${name} (${calories} kcal)`);
}

function clearFoodForm() {
    document.getElementById('foodName').value = '';
    document.getElementById('foodCalories').value = '';
    document.getElementById('foodProtein').value = '';
    document.getElementById('foodCarbs').value = '';
    document.getElementById('foodFat').value = '';
}

function deleteFoodEntry(index) {
    if (confirm('¿Eliminar este registro?')) {
        foodEntries.splice(index, 1);
        saveNutrition();
        renderNutrition();
        showToast('🗑️ Registro eliminado');
    }
}

function getTodayEntries() {
    const today = new Date().toDateString();
    return foodEntries.filter(entry => new Date(entry.date).toDateString() === today);
}

function renderNutrition() {
    const todayEntries = getTodayEntries();
    const totalCalories = todayEntries.reduce((sum, e) => sum + e.calories, 0);
    const totalProtein = todayEntries.reduce((sum, e) => sum + (e.protein || 0), 0);
    const totalCarbs = todayEntries.reduce((sum, e) => sum + (e.carbs || 0), 0);
    const totalFat = todayEntries.reduce((sum, e) => sum + (e.fat || 0), 0);
    
    const burnedCalories = getTodayCaloriesBurned();
    const recommendedTarget = nutritionGoal.recommendedCalories || 1800;
    const adjustedTarget = recommendedTarget + burnedCalories;
    
    document.getElementById('dailyCalories').innerText = totalCalories;
    document.getElementById('dailyProtein').innerText = totalProtein;
    document.getElementById('dailyCarbs').innerText = totalCarbs;
    document.getElementById('dailyFat').innerText = totalFat;
    document.getElementById('burnedCalories').innerText = burnedCalories;
    document.getElementById('adjustedTarget').innerText = adjustedTarget;
    
    const percent = Math.min(100, (totalCalories / adjustedTarget) * 100);
    document.getElementById('calorieProgress').style.width = percent + '%';
    
    const remaining = adjustedTarget - totalCalories;
    const calorieMsg = document.getElementById('calorieMsg');
    if (remaining > 0) {
        calorieMsg.innerHTML = `🍽️ Te quedan ${remaining} kcal para hoy (objetivo ajustado: ${adjustedTarget} kcal). 🔥 Has quemado ${burnedCalories} kcal con deporte.`;
        calorieMsg.style.color = 'var(--accent)';
    } else {
        calorieMsg.innerHTML = `⚠️ Has superado tu objetivo en ${Math.abs(remaining)} kcal. 🔥 Has quemado ${burnedCalories} kcal con deporte.`;
        calorieMsg.style.color = 'var(--warning)';
    }
    
    // Historial
    const historyContainer = document.getElementById('foodHistory');
    if (foodEntries.length === 0) {
        historyContainer.innerHTML = '<li style="text-align: center; padding: 30px;">🍽️ No hay alimentos registrados</li>';
    } else {
        historyContainer.innerHTML = foodEntries.slice(0, 30).map((entry, idx) => `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
                <div>
                    <i class="fas fa-apple-alt" style="color: var(--accent);"></i>
                    <strong>${escapeHtml(entry.name)}</strong><br>
                    <small>${entry.calories} kcal · P:${entry.protein || 0}g · C:${entry.carbs || 0}g · G:${entry.fat || 0}g</small>
                </div>
                <div>
                    <small>${new Date(entry.date).toLocaleString()}</small>
                    <button onclick="deleteFoodEntry(${idx})" class="btn-danger" style="margin-left: 10px; padding: 4px 8px;"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `).join('');
    }
}

function saveGoal() {
    const currentWeight = parseFloat(document.getElementById('currentWeight').value);
    const goalWeight = parseFloat(document.getElementById('goalWeight').value);
    const targetCalories = parseFloat(document.getElementById('targetCalories').value);
    const activityLevel = document.getElementById('activityLevel').value;
    
    if (currentWeight) nutritionGoal.currentWeight = currentWeight;
    if (goalWeight) nutritionGoal.goalWeight = goalWeight;
    if (targetCalories) nutritionGoal.targetCalories = targetCalories;
    if (activityLevel) nutritionGoal.activityLevel = activityLevel;
    
    calculateRecommendedCalories();
    saveNutrition();
    renderNutrition();
    showToast('💾 Objetivo guardado');
}

async function searchFood() {
    const query = document.getElementById('searchFoodInput').value.trim();
    const resultsDiv = document.getElementById('foodSearchResults');
    
    if (!query) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">🔍 Escribe un alimento para buscar</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Buscando...</div>';
    
    try {
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
        const data = await response.json();
        
        if (!data.products || data.products.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">❌ No se encontraron alimentos</div>';
            return;
        }
        
        resultsDiv.innerHTML = data.products.map(product => {
            const name = product.product_name || 'Sin nombre';
            const calories = product.nutriments?.energy_kcal_100g || 0;
            const protein = product.nutriments?.proteins_100g || 0;
            const carbs = product.nutriments?.carbohydrates_100g || 0;
            const fat = product.nutriments?.fat_100g || 0;
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
                    <div>
                        <strong>${escapeHtml(name)}</strong>
                        <small style="display: block;">${calories} kcal/100g · P:${protein}g · C:${carbs}g · G:${fat}g</small>
                    </div>
                    <button onclick="selectFood('${escapeHtml(name).replace(/'/g, "\\'")}', ${calories}, ${protein}, ${carbs}, ${fat})" class="btn-secondary">Seleccionar</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">❌ Error al buscar</div>';
    }
}

function selectFood(name, calories, protein, carbs, fat) {
    document.getElementById('foodName').value = name;
    document.getElementById('foodCalories').value = calories;
    document.getElementById('foodProtein').value = protein;
    document.getElementById('foodCarbs').value = carbs;
    document.getElementById('foodFat').value = fat;
    document.getElementById('foodSearchResults').innerHTML = '';
    document.getElementById('searchFoodInput').value = '';
    showToast(`🍽️ ${name} seleccionado (por 100g)`);
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'nutrition' && currentPage === 'nutrition.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    loadNutrition();
    initDockActive();
    document.getElementById('addFoodBtn')?.addEventListener('click', addFood);
    document.getElementById('saveGoalBtn')?.addEventListener('click', saveGoal);
    document.getElementById('searchFoodBtn')?.addEventListener('click', searchFood);
    document.getElementById('searchFoodInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchFood(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.deleteFoodEntry = deleteFoodEntry;
window.selectFood = selectFood;
window.searchFood = searchFood;