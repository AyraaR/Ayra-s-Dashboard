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
    // Actualizar widget de la home si existe la función
    if (window.updatePreviews) window.updatePreviews();
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

// Función para obtener portada de un libro (usada por el widget)
async function getBookCover(title) {
    try {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.docs && data.docs[0] && data.docs[0].cover_i) {
            return `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-S.jpg`;
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function searchBooks() {
    const query = document.getElementById('searchBookInput').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--warning);">✏️ Escribe el título de un libro</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Buscando libros...</div>';
    
    try {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,first_publish_year,cover_i,isbn`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.docs || data.docs.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">📚 No se encontraron libros. Prueba con otro título.</div>';
            return;
        }
        
        resultsDiv.innerHTML = data.docs.map(book => {
            const title = book.title || 'Sin título';
            const authors = book.author_name ? book.author_name.join(', ') : 'Autor desconocido';
            const year = book.first_publish_year || '';
            const coverId = book.cover_i;
            const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg` : '';
            
            return `
                <div style="display: flex; gap: 15px; padding: 15px; border-bottom: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); border-radius: 16px; margin-bottom: 10px;">
                    ${coverUrl ? `<img src="${coverUrl}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 8px;" onerror="this.src=''">` : '<div style="width:60px;height:80px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center"><i class="fas fa-book" style="font-size: 2rem;"></i></div>'}
                    <div style="flex: 1;">
                        <strong style="color: var(--accent);">${escapeHtml(title)}</strong>
                        <small style="display: block; color: var(--text-secondary);">${escapeHtml(authors)} ${year ? `(${year})` : ''}</small>
                        <div style="margin-top: 8px; display: flex; gap: 8px;">
                            <button onclick="addToToRead('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(authors).replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 6px 12px;"><i class="fas fa-clock"></i> Quiero leer</button>
                            <button onclick="addToRead('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(authors).replace(/'/g, "\\'")}')" class="btn-primary" style="padding: 6px 12px;"><i class="fas fa-check"></i> Ya leído</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">❌ Error al buscar libros. Verifica tu conexión.</div>';
    }
}

function addToToRead(title, author) {
    toReadBooks.unshift({ title, author, date: new Date().toISOString() });
    saveBooks();
    renderBooks();
    showToast('📚 Añadido a "Por leer"');
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchBookInput').value = '';
}

function addToRead(title, author) {
    readBooks.unshift({ title, author, date: new Date().toISOString() });
    saveBooks();
    renderBooks();
    showToast('✅ Añadido a "Leídos"');
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchBookInput').value = '';
}

function moveToRead(index) {
    const book = toReadBooks[index];
    if (book) {
        toReadBooks.splice(index, 1);
        readBooks.unshift(book);
        saveBooks();
        renderBooks();
        showToast('✅ Movido a leídos');
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
        container.innerHTML = `<li style="text-align: center; padding: 30px; color: var(--text-secondary);"><i class="fas fa-book-open"></i> No hay libros en "${title}"</li>`;
        return;
    }
    
    container.innerHTML = books.map((book, index) => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--glass-border);">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${activeTab === 'toRead' ? 'fa-clock' : 'fa-check-circle'}" style="color: ${activeTab === 'toRead' ? 'var(--warning)' : 'var(--success)'}"></i>
                <div>
                    <strong>${escapeHtml(book.title)}</strong>
                    <small style="display: block; color: var(--text-secondary);">${escapeHtml(book.author)}</small>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                ${activeTab === 'toRead' ? `<button onclick="moveToRead(${index})" class="btn-secondary" style="padding: 4px 12px;"><i class="fas fa-check"></i></button>` : ''}
                <button onclick="${activeTab === 'toRead' ? `removeFromToRead(${index})` : `removeFromRead(${index})`}" class="btn-danger" style="padding: 4px 12px;"><i class="fas fa-trash"></i></button>
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
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) { window.location.href = '../index.html'; return; }
    const user = getCurrentUser();
    if (user && document.getElementById('userName')) document.getElementById('userName').innerText = user.username;
    loadBooks();
    initTabs();
    initDockActive();
    
    const searchBtn = document.getElementById('searchBookBtn');
    const searchInput = document.getElementById('searchBookInput');
    
    if (searchBtn) searchBtn.addEventListener('click', searchBooks);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchBooks(); });
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

window.addToToRead = addToToRead;
window.addToRead = addToRead;
window.moveToRead = moveToRead;
window.removeFromToRead = removeFromToRead;
window.removeFromRead = removeFromRead;
window.searchBooks = searchBooks;
window.getBookCover = getBookCover;