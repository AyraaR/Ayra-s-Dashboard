const USERS_KEY = 'jarvis_users';
const SESSION_KEY = 'jarvis_session';

// Datos iniciales por defecto para nuevos usuarios
function getDefaultUserData() {
    return {
        workSettings: {
            monday: { isTelework: false, isVacation: false, customHours: null, customStartTime: null },
            tuesday: { isTelework: false, isVacation: false, customHours: null, customStartTime: null },
            wednesday: { isTelework: false, isVacation: false, customHours: null, customStartTime: null },
            thursday: { isTelework: false, isVacation: false, customHours: null, customStartTime: null },
            friday: { isTelework: false, isVacation: false, customHours: null, customStartTime: null },
            globalStartTime: '08:30'
        },
        shopping: [],
        books: [],
        series: {
            pending: [],
            watched: []
        }
    };
}

function getUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : {};
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function registerUser(username, password) {
    const users = getUsers();
    if (users[username]) {
        return { success: false, error: 'El usuario ya existe' };
    }
    if (username.length < 3) {
        return { success: false, error: 'El usuario debe tener al menos 3 caracteres' };
    }
    if (password.length < 4) {
        return { success: false, error: 'La contraseña debe tener al menos 4 caracteres' };
    }
    users[username] = {
        password: password,
        createdAt: new Date().toISOString(),
        data: getDefaultUserData()
    };
    saveUsers(users);
    return { success: true };
}

function loginUser(username, password) {
    const users = getUsers();
    if (!users[username] || users[username].password !== password) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
    }
    const session = {
        username: username,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true };
}

function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = '../index.html';
}

function getCurrentUser() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const parsed = JSON.parse(session);
    const users = getUsers();
    if (!users[parsed.username]) return null;
    return {
        username: parsed.username,
        data: users[parsed.username].data
    };
}

function isAuthenticated() {
    return getCurrentUser() !== null;
}

function getUserData() {
    const user = getCurrentUser();
    if (!user) return null;
    return user.data;
}

function saveUserData(data) {
    const user = getCurrentUser();
    if (!user) return false;
    const users = getUsers();
    users[user.username].data = data;
    saveUsers(users);
    return true;
}