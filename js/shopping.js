function renderShoppingList() {
    const userData = getUserData();
    if (!userData) return;
    
    const items = userData.shopping || [];
    const container = document.getElementById('shoppingList');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 20px;"><i class="fas fa-smile-wink"></i> ¡Tu lista está vacía! Añade productos.</li>';
        return;
    }
    
    container.innerHTML = items.map((item, index) => `
        <li class="${item.completed ? 'completed-item' : ''}">
            <div class="item-info">
                <i class="fas ${item.completed ? 'fa-check-circle' : 'fa-circle'}" 
                   style="cursor: pointer; color: ${item.completed ? 'var(--success)' : 'var(--accent)'}"
                   onclick="toggleItem(${index})"></i>
                <span class="item-name">${escapeHtml(item.name)}</span>
            </div>
            <div class="item-actions">
                <button class="btn-danger" onclick="deleteItem(${index})" style="padding: 4px 12px;"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.toggleItem = function(index) {
    const userData = getUserData();
    if (!userData) return;
    userData.shopping[index].completed = !userData.shopping[index].completed;
    saveUserData(userData);
    renderShoppingList();
};

window.deleteItem = function(index) {
    const userData = getUserData();
    if (!userData) return;
    userData.shopping.splice(index, 1);
    saveUserData(userData);
    renderShoppingList();
};

function addItem() {
    const input = document.getElementById('newItemName');
    const name = input.value.trim();
    if (!name) return;
    
    const userData = getUserData();
    if (!userData) return;
    
    if (!userData.shopping) userData.shopping = [];
    userData.shopping.push({ name: name, completed: false });
    saveUserData(userData);
    input.value = '';
    renderShoppingList();
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if ((page === 'shopping' && currentPage === 'shopping.html')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) {
        window.location.href = '../index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) {
        document.getElementById('userName').innerText = user.username;
    }
    
    renderShoppingList();
    initDockActive();
    
    document.getElementById('addItemBtn')?.addEventListener('click', addItem);
    document.getElementById('newItemName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});