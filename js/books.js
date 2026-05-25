// Google Books API - No necesita API key para búsquedas básicas
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Estados de libros
let booksData = { read: [], toRead: [] };

function loadBooksData() {
    const userData = getUserData();
    if (userData) {
        booksData.read = userData.books || [];
        booksData.toRead = userData.toReadBooks || [];
    }
    renderBooksList();
}

function saveBooksData() {
    const userData = getUserData();
    if (userData) {
        userData.books = booksData.read;
        userData.toReadBooks = booksData.toRead;
        saveUserData(userData);
    }
}

async function searchBooks() {
    const query = document.getElementById('searchBookInput').value.trim();
    if (!query) return;
    
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Buscando...</div>';
    
    try {
        const response = await fetch(`${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=es`);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">No se encontraron resultados</div>';
            return;
        }
        
        resultsDiv.innerHTML = data.items.map(book => {
            const volume = book.volumeInfo;
            const title = volume.title || 'Sin título';
            const authors = volume.authors ? volume.authors.join(', ') : 'Autor desconocido';
            const cover = volume.imageLinks?.thumbnail || '';
            const publishedDate = volume.publishedDate || 'Fecha desconocida';
            const description = volume.description ? volume.description.substring(0, 150) + '...' : 'Sin descripción';
            
            return `
                <div style="display: flex; gap: 15px; padding: 15px; border-bottom: 1px solid var(--glass-border);">
                    ${cover ? `<img src="${cover}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 8px;">` : '<div style="width: 60px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-book" style="font-size: 2rem;"></i></div>'}
                    <div style="flex: 1;">
                        <strong>${escapeHtml(title)}</strong><br>
                        <small style="color: var(--text-secondary);">${escapeHtml(authors)}</small><br>
                        <small style="color: var(--text-secondary);">📅 ${publishedDate}</small>
                        <p style="font-size: 0.8rem; margin-top: 5px;">${escapeHtml(description)}</p>
                        <div style="margin-top: 8px; display: flex; gap: 8px;">
                            <button onclick="addToRead('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(authors).replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 4px 12px;"><i class="fas fa-check"></i> Leído</button>
                            <button onclick="addToWantRead('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(authors).replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 4px 12px;"><i class="fas fa-clock"></i> Quiero leer</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error searching books:', error);
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error al buscar. Intenta de nuevo.</div>';
    }
}

function addToRead(title, author) {
    booksData.read.unshift({ title: title, author: author, date: new Date().toISOString() });
    saveBooksData();
    renderBooksList();
    showTemporaryMessage('Libro añadido a "Leídos"');
}

function addToWantRead(title, author) {
    booksData.toRead.unshift({ title: title, author: author });
    saveBooksData();
    renderBooksList();
    showTemporaryMessage('Libro añadido a "Por leer"');
}

function moveToRead(index) {
    const book = booksData.toRead[index];
    if (book) {
        booksData.toRead.splice(index, 1);
        booksData.read.unshift({ ...book, date: new Date().toISOString() });
        saveBooksData();
        renderBooksList();
    }
}

function removeFromRead(index) {
    booksData.read.splice(index, 1);
    saveBooksData();
    renderBooksList();
}

function removeFromToRead(index) {
    booksData.toRead.splice(index, 1);
    saveBooksData();
    renderBooksList();
}

function renderBooksList() {
    const container = document.getElementById('booksList');
    if (!container) return;
    
    let html = '';
    
    // Sección "Por leer"
    html += `<h3 style="margin: 15px 0 10px 0;"><i class="fas fa-clock"></i> Por leer (${booksData.toRead.length})</h3>`;
    if (booksData.toRead.length === 0) {
        html += '<li style="text-align: center; padding: 10px; color: var(--text-secondary);">No hay libros pendientes</li>';
    } else {
        html += booksData.toRead.map((book, index) => `
            <li>
                <div class="item-info">
                    <i class="fas fa-clock" style="color: var(--warning);"></i>
                    <span><strong>${escapeHtml(book.title)}</strong>${book.author ? ` - ${escapeHtml(book.author)}` : ''}</span>
                </div>
                <div class="item-actions">
                    <button onclick="moveToRead(${index})" class="btn-secondary" style="padding: 4px 12px;"><i class="fas fa-check"></i></button>
                    <button onclick="removeFromToRead(${index})" class="btn-danger" style="padding: 4px 12px;"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `).join('');
    }
    
    // Sección "Leídos"
    html += `<h3 style="margin: 25px 0 10px 0;"><i class="fas fa-check-circle"></i> Leídos (${booksData.read.length})</h3>`;
    if (booksData.read.length === 0) {
        html += '<li style="text-align: center; padding: 10px; color: var(--text-secondary);">Aún no has leído ningún libro</li>';
    } else {
        html += booksData.read.map((book, index) => `
            <li>
                <div class="item-info">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    <span><strong>${escapeHtml(book.title)}</strong>${book.author ? ` - ${escapeHtml(book.author)}` : ''}</span>
                </div>
                <div class="item-actions">
                    <button onclick="removeFromRead(${index})" class="btn-danger" style="padding: 4px 12px;"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `).join('');
    }
    
    container.innerHTML = html;
}

function showTemporaryMessage(msg) {
    let msgDiv = document.getElementById('tempMessage');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'tempMessage';
        msgDiv.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: var(--accent); padding: 10px 20px; border-radius: 40px; z-index: 2000;';
        document.body.appendChild(msgDiv);
    }
    msgDiv.innerText = msg;
    msgDiv.style.display = 'block';
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 2000);
}

function initDockActive() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.dock-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === 'books' && currentPage === 'books.html') {
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
    
    loadBooksData();
    initDockActive();
    
    document.getElementById('searchBookBtn')?.addEventListener('click', searchBooks);
    document.getElementById('searchBookInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBooks();
    });
    document.getElementById('logoutBtn')?.addEventListener('click', () => logoutUser());
});

// Exponer funciones globalmente
window.addToRead = addToRead;
window.addToWantRead = addToWantRead;
window.moveToRead = moveToRead;
window.removeFromRead = removeFromRead;
window.removeFromToRead = removeFromToRead;