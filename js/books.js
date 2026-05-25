let activeTab = 'toRead';
let toReadBooks = [];
let readBooks = [];

function loadBooks() {
    const userData = getUserData();
    if (userData) {
        toReadBooks = userData.toReadBooks || [];
        readBooks = userData.books || [];
    }
    renderBooks();
}

function saveBooks() {
    const userData = getUserData();
    if (userData) {
        userData.toReadBooks = toReadBooks;
        userData.books = readBooks;
        saveUserData(userData);
        if (window.updatePreviews) window.updatePreviews();
    }
}

async function searchBooks() {
    const query = document.getElementById('searchBookInput').value.trim();
    if (!query) return;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Buscando...</div>';
    
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=es`);
        const data = await response.json();
        if (!data.items || data.items.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">No se encontraron resultados</div>';
            return;
        }
        resultsDiv.innerHTML = data.items.map(book => {
            const info = book.volumeInfo;
            const title = info.title || 'Sin título';
            const authors = info.authors ? info.authors.join(', ') : 'Autor desconocido';
            const cover = info.imageLinks?.thumbnail || '';
            return `
                <div class="result-item">
                    ${cover ? `<img src="${cover}" onerror="this.style.display='none'">` : '<div style="width:60px;height:80px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center"><i class="fas fa-book"></i></div>'}
                    <div class="result-info">
                        <strong>${escapeHtml(title)}</strong>
                        <small>${escapeHtml(authors)}</small>
                        <div class="result-actions">
                            <button onclick="addToToRead('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(authors).replace(/'/g, "\\'")}')" class="btn-secondary">📚 Quiero leer</button>
                            <button onclick="addToRead('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(authors).replace(/'/g, "\\'")}')" class="btn-primary">✅ Leído</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error al buscar libros. Intenta de nuevo.</div>';
    }
}

function addToToRead(title, author) {
    toReadBooks.unshift({ title, author, date: new Date().toISOString() });
    saveBooks();
    renderBooks();
    showToast('Añadido a "Por leer"');
}

function addToRead(title, author) {
    readBooks.unshift({ title, author, date: new Date().toISOString() });
    saveBooks();
    renderBooks();
    showToast('Añadido a "Leídos"');
}

function moveToRead(index) {
    const book = toReadBooks[index];
    if (book) {
        toReadBooks.splice(index, 1);
        readBooks.unshift(book);
        saveBooks();
        renderBooks();
    }
}

function removeFromToRead(index) {
    toReadBooks.splice(index, 1);
    saveBooks();
    renderBooks();
}

function removeFromRead(index) {
    readBooks.splice(index, 1);
    saveBooks();
    renderBooks();
}

function renderBooks() {
    const container = document.getElementById('booksList');
    if (!container) return;
    
    let books = activeTab === 'toRead' ? toReadBooks : readBooks;
    let title = activeTab === 'toRead' ? '📚 Por leer' : '✅ Leídos';
    
    if (books.length === 0) {
        container.innerHTML = `<li style="text-align: center; padding: 20px;">No hay libros en "${title}"</li>`;
        return;
    }
    
    container.innerHTML = books.map((book, index) => `
        <li>
            <div class="item-info">
                <i class="fas ${activeTab === 'toRead' ? 'fa-clock' : 'fa-check-circle'}" style="color: ${activeTab === 'toRead' ? 'var(--warning)' : 'var(--success)'}"></i>
                <span><strong>${escapeHtml(book.title)}</strong> - ${escapeHtml(book.author)}</span>
            </div>
            <div class="item-actions">
                ${activeTab === 'toRead' ? `<button onclick="moveToRead(${index})" class="btn-secondary"><i class="fas fa-check"></i></button>` : ''}
                <button onclick="${activeTab === 'toRead' ? `removeFromToRead(${index})` : `removeFromRead(${index})`}" class="btn-danger"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('');
}

function initTabs() {
    const tabToRead = document.getElementById('tabToRead');
    const tabRead = document.getElementById('tabRead');
    if (tabToRead) tabToRead.onclick = () => { activeTab = 'toRead'; renderBooks(); updateTabStyle(); };
    if (tabRead) tabRead.onclick = () => { activeTab = 'read'; renderBooks(); updateTabStyle(); };
    updateTabStyle();
}

function updateTabStyle() {
    const tabToRead = document.getElementById('tabToRead');
    const tabRead = document.getElementById('tabRead');
    if (tabToRead) tabToRead.style.background = activeTab === 'toRead' ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
    if (tabRead) tabRead.style.background = activeTab === 'read' ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        if (page === 'books' && currentPage === 'books.html') item.classList.add('active');
        if (page === 'home' && currentPage === 'home.html') item.classList.add('active');
        if (page === 'calculator' && currentPage === 'calculator.html') item.classList.add('active');
        if (page === 'shopping' && currentPage === 'shopping.html') item.classList.add('active');
        if (page === 'series' && currentPage === 'series.html') item.classList.add('active');
        if (page === 'stats' && currentPage === 'stats.html') item.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    loadBooks();
    initTabs();
    initDockActive();
    document.getElementById('searchBookBtn')?.addEventListener('click', searchBooks);
    document.getElementById('searchBookInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchBooks(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.addToToRead = addToToRead;
window.addToRead = addToRead;
window.moveToRead = moveToRead;
window.removeFromToRead = removeFromToRead;
window.removeFromRead = removeFromRead;
window.searchBooks = searchBooks;