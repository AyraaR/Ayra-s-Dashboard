// Funciones comunes y verificación de sesión
function checkAuthAndRedirect() {
    if (!isAuthenticated()) {
        window.location.href = '../index.html';
        return false;
    }
    return true;
}

function updateUserDisplay() {
    const user = getCurrentUser();
    if (user && document.getElementById('greeting')) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Buenos días' : (hour < 20 ? 'Buenas tardes' : 'Buenas noches');
        document.getElementById('greeting').innerText = `${greeting}, ${user.username}`;
    }
    if (user && document.getElementById('userName')) {
        document.getElementById('userName').innerText = user.username;
    }
}

// Configurar menú flotante
function initFloatingMenu() {
    const toggle = document.getElementById('menuToggle');
    const options = document.getElementById('menuOptions');
    if (toggle && options) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            options.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!toggle.contains(e.target) && !options.contains(e.target)) {
                options.classList.remove('show');
            }
        });
    }
    
    const menuLogout = document.getElementById('menuLogout');
    if (menuLogout) {
        menuLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }
}

// Configurar logout normal
function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutUser();
        });
    }
}

// Doble clic en widgets para navegar
function initWidgetNavigation() {
    document.querySelectorAll('.widget').forEach(widget => {
        widget.addEventListener('dblclick', () => {
            const page = widget.getAttribute('data-page');
            if (page && page !== '#') {
                window.location.href = page;
            }
        });
    });
}

// Inicialización común
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthAndRedirect()) return;
    updateUserDisplay();
    initFloatingMenu();
    initLogoutButton();
    initWidgetNavigation();
});