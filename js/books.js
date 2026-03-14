/* =========================
   books.js (FIXED)
   - Works for: home/store grid + book details
   - Requires api.js loaded BEFORE this file
========================= */

/* ---------- Safe fileUrl wrapper ----------
   api.js already defines fileUrl(relPath).
   This wrapper prevents errors if api.js isn't loaded for some reason.
------------------------------------------ */
function safeFileUrl(path) {
  try {
    if (typeof fileUrl === 'function') return fileUrl(path);
  } catch (_) {}
  // fallback
  if (path == null || path === '') return '';
  const p = String(path).trim();
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = (window.FILE_BASE_URL || 'https://blueleafbooks-backend-geum.onrender.com').replace(/\/$/, '');
  return `${base}/${p.replace(/^\/+/, '')}`;
}

/* =========================
   GRID / LIST (Home / Store)
========================= */
function displayBooks(books, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = '<p class="loading">No books found.</p>';
    return;
  }

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='300'%3E%3Crect fill='%23e0e0e0' width='250' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14'%3ENo Cover%3C/text%3E%3C/svg%3E";

  container.innerHTML = books
    .map((book) => {
      const cover = safeFileUrl(book?.coverImage) || PLACEHOLDER;
      const title = book?.title || 'Untitled';
      const authorName = book?.author?.name || 'Unknown Author';
      const price = Number(book?.price || 0).toFixed(2);
      const rating = Math.floor(Number(book?.rating || 0));
      const ratingCount = Number(book?.ratingCount || 0);

      return `
        <div class="book-card" onclick="window.location.href='book-details.html?id=${book._id}'">
          <img src="${cover}" alt="${title}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
               onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
          <div class="book-card-content">
            <div class="book-card-title">${title}</div>
            <div class="book-card-author">${authorName}</div>
            <div class="book-card-price">$${price}</div>
            <div class="book-card-rating">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${ratingCount})</div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function loadBooks(params = {}) {
  try {
    if (!booksAPI || typeof booksAPI.getAll !== 'function') {
      throw new Error('booksAPI.getAll is not available. Make sure api.js is loaded before books.js');
    }
    const books = await booksAPI.getAll(params);
    displayBooks(Array.isArray(books) ? books : [], 'books-container');
  } catch (error) {
    console.error('Error loading books:', error);
    const el = document.getElementById('books-container');
    if (el) el.innerHTML = '<p class="alert alert-error">Error loading books. Please try again.</p>';
  }
}

/* =========================
   BOOK DETAILS
========================= */
async function loadBookDetails(bookId) {
  try {
    if (!booksAPI || typeof booksAPI.getById !== 'function') {
      throw new Error('booksAPI.getById is not available. Make sure api.js is loaded before books.js');
    }
    const book = await booksAPI.getById(bookId);
    let ratingState = null;
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user && user.role === 'customer' && booksAPI && typeof booksAPI.canRate === 'function') {
      try {
        ratingState = await booksAPI.canRate(bookId);
      } catch (_) {}
    }
    displayBookDetails(book, ratingState);
  } catch (error) {
    console.error('Error loading book details:', error);
    const container = document.querySelector('.book-details-container');
    if (container) container.innerHTML = '<p class="alert alert-error">Book not found.</p>';
  }
}

async function submitBookRating(bookId, value) {
  try {
    await booksAPI.rate(bookId, value);
    const [book, ratingState] = await Promise.all([
      booksAPI.getById(bookId),
      booksAPI.canRate(bookId)
    ]);
    ratingState.existingRating = value;
    displayBookDetails(book, ratingState);
    const msg = document.getElementById('book-rating-message');
    if (msg) msg.textContent = `Your rating has been saved: ${value}/5`;
  } catch (error) {
    alert(error.message || 'Failed to save rating.');
  }
}

/* =========================
   CART
========================= */
function addToCart(bookId) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  if (cart.includes(bookId)) {
    alert('This book is already in your cart!');
    return;
  }

  cart.push(bookId);
  localStorage.setItem('cart', JSON.stringify(cart));
  alert('Book added to cart!');
  updateCartCount();
}

function buyNow(bookId) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  if (!cart.includes(bookId)) {
    cart.push(bookId);
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  updateCartCount();
  window.location.href = 'checkout.html';
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartLink = document.querySelector('a[href="cart.html"]');
  if (!cartLink) return;

  const count = cart.length;
  cartLink.textContent = count > 0 ? `Cart (${count})` : 'Cart';
}

/* =========================
   GENRES (Filter)
========================= */
async function loadGenres() {
  try {
    if (!booksAPI || typeof booksAPI.getGenres !== 'function') return;

    const genres = await booksAPI.getGenres();
    const select = document.getElementById('genre-filter');
    if (!select) return;

    select.innerHTML =
      '<option value="">All Genres</option>' +
      (Array.isArray(genres) ? genres.map((g) => `<option value="${g}">${g}</option>`).join('') : '');
  } catch (error) {
    console.error('Error loading genres:', error);
  }
}

/* =========================
   CURATED / FEATURED
========================= */
async function loadCuratedBooks() {
  const container = document.getElementById('curated-books');
  if (!container) return;

  try {
    // Prefer booksAPI if available; otherwise fall back to fetch
    let books = [];
    if (booksAPI && typeof booksAPI.getCurated === 'function') {
      books = await booksAPI.getCurated();
    } else if (typeof API_BASE_URL !== 'undefined') {
      const res = await fetch(`${API_BASE_URL}/books/featured/curated`);
      books = await res.json();
    }

    if (!Array.isArray(books) || books.length === 0) {
      container.innerHTML = '<p class="muted">No featured books yet.</p>';
      return;
    }

    const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='300'%3E%3Crect fill='%23e0e0e0' width='250' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14'%3ENo Cover%3C/text%3E%3C/svg%3E";
    container.innerHTML = books
      .map((book) => {
        const cover = safeFileUrl(book?.coverImage) || PLACEHOLDER;
        const title = book?.title || 'Untitled';
        const authorName = book?.author?.name || 'Unknown Author';
        const price = Number(book?.price || 0).toFixed(2);

        return `
          <div class="book-card" onclick="window.location.href='book-details.html?id=${book._id}'">
            <img src="${cover}" alt="${title}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                 onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
            <div class="book-card-content">
              <div class="book-card-title">${title}</div>
              <div class="book-card-author">${authorName}</div>
              <div class="book-card-price">$${price}</div>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p class="muted">Failed to load featured books.</p>';
  }
}

/* =========================
   INIT (THIS WAS MISSING)
   - Auto-detect which page we are on
========================= */
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();

  // 1) Book details page
  const detailsContainer = document.querySelector('.book-details-container');
  if (detailsContainer) {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');
    if (bookId) loadBookDetails(bookId);
    return;
  }

  // 2) Books grid page (store/home)
  const booksContainer = document.getElementById('books-container');
  if (booksContainer) {
    loadBooks();
  }

  // 3) Curated section (if present)
  if (document.getElementById('curated-books')) {
    loadCuratedBooks();
  }

  // 4) Genres filter (if present)
  if (document.getElementById('genre-filter')) {
    loadGenres();
  }
});