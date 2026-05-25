async function updatePreviews() {
    const userData = getUserData();
    if (!userData) return;
    
    // Libros preview - SOLO 3 items, ocupando todo el ancho
    const booksPreview = document.getElementById('booksPreview');
    if (booksPreview) {
        const books = userData.books || [];
        if (books.length === 0) {
            booksPreview.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fas fa-book-open"></i><br>No hay libros</div>';
        } else {
            const previewItems = await Promise.all(books.slice(0, 3).map(async (book) => {
                let coverUrl = '';
                try {
                    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(book.title)}&limit=1`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.docs && data.docs[0] && data.docs[0].cover_i) {
                        coverUrl = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-M.jpg`;
                    }
                } catch(e) {}
                
                return `<div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 16px; margin: 0 5px;">
                            ${coverUrl ? `<img src="${coverUrl}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 12px;">` : '<i class="fas fa-book" style="font-size: 3rem; color: var(--accent);"></i>'}
                            <div style="font-size: 0.7rem; margin-top: 5px;">${escapeHtml(book.title.substring(0, 20))}</div>
                        </div>`;
            }));
            booksPreview.innerHTML = `<div style="display: flex; gap: 10px;">${previewItems.join('')}</div>`;
        }
    }
    
    // Series preview - SOLO 3 items
    const seriesPreview = document.getElementById('seriesPreview');
    if (seriesPreview) {
        const watched = userData.series?.watched || [];
        if (watched.length === 0) {
            seriesPreview.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fas fa-tv"></i><br>No hay series</div>';
        } else {
            const previewItems = await Promise.all(watched.slice(0, 3).map(async (series) => {
                let posterUrl = '';
                try {
                    const response = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=d9940498503065e949b5ee26c152eaa1&query=${encodeURIComponent(series.title)}`);
                    const data = await response.json();
                    if (data.results && data.results[0]?.poster_path) {
                        posterUrl = `https://image.tmdb.org/t/p/w185${data.results[0].poster_path}`;
                    }
                } catch(e) {}
                
                return `<div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 16px; margin: 0 5px;">
                            ${posterUrl ? `<img src="${posterUrl}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 12px;">` : '<i class="fas fa-tv" style="font-size: 3rem; color: var(--accent);"></i>'}
                            <div style="font-size: 0.7rem; margin-top: 5px;">${escapeHtml(series.title.substring(0, 20))}</div>
                        </div>`;
            }));
            seriesPreview.innerHTML = `<div style="display: flex; gap: 10px;">${previewItems.join('')}</div>`;
        }
    }
    
    // Shopping preview
    const shoppingPreview = document.getElementById('shoppingPreview');
    if (shoppingPreview) {
        const items = userData.shopping || [];
        if (items.length === 0) {
            shoppingPreview.innerHTML = '<li style="text-align: center; padding: 20px;"><i class="fas fa-plus-circle"></i> Añade items</li>';
        } else {
            shoppingPreview.innerHTML = items.slice(0, 5).map(item => `<li><i class="fas ${item.completed ? 'fa-check-circle' : 'fa-circle'}" style="color: ${item.completed ? 'var(--success)' : 'var(--accent)'}"></i> ${escapeHtml(item.name)}</li>`).join('');
        }
    }
}