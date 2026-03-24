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
      const salesCount = Number(book?.salesCount || 0);
      const createdAt = book?.createdAt ? new Date(book.createdAt) : null;
      const daysOld = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86400000) : null;
      const badges = [];
      if (salesCount >= 1) badges.push('<span class="badge badge-success">Bestseller</span>');
      if (ratingCount >= 3 && Number(book?.rating || 0) >= 4) badges.push('<span class="badge badge-warning">Top Rated</span>');
      if (daysOld !== null && daysOld <= 14) badges.push('<span class="badge" style="background:#e0f2fe;color:#075985;">New</span>');

      return `
        <div class="book-card" onclick="window.location.href='/book-details?id=${book._id}'">
          <img src="${cover}" alt="${title}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
               onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
          <div class="book-card-content">
            <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.45rem;">${badges.join('')}</div>
            <div class="book-card-title">${title}</div>
            <div class="book-card-author">${authorName}</div>
            <div class="book-card-price">$${price}</div>
            <div class="book-card-rating">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${ratingCount})</div>
            <div style="font-size:0.9rem;color:#666;margin-top:0.35rem;">Sold ${salesCount} time${salesCount === 1 ? '' : 's'}</div>
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
    displayBookDetails(book);
  } catch (error) {
    console.error('Error loading book details:', error);
    const container = document.querySelector('.book-details-container');
    if (container) container.innerHTML = '<p class="alert alert-error">Book not found.</p>';
  }
}

function displayBookDetails(book) {
  const container = document.querySelector('.book-details-container');
  if (!container) return;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isCustomer = !!(user && user.role === 'customer');
  const token = typeof getAuthToken === 'function' ? getAuthToken() : null;

  const hasPrice = !!(book?.price && Number(book.price) > 0);
  const hasPdf = String(book?.status || 'approved') === 'approved';

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect fill='%23e0e0e0' width='300' height='400'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='16'%3ENo Cover%3C/text%3E%3C/svg%3E";
  const cover = safeFileUrl(book?.coverImage) || PLACEHOLDER;

  const title = book?.title || 'Untitled';
  const authorName = book?.author?.name || 'Unknown Author';
  const price = Number(book?.price || 0).toFixed(2);
  const rating = Math.round(Number(book?.rating || 0));
  const ratingCount = Number(book?.ratingCount || 0);
  const description = book?.description || '';
  const genre = book?.genre || '';
  const salesCount = Number(book?.salesCount || 0);
  const isBestseller = salesCount >= 1;
  const isTopRated = ratingCount >= 3 && Number(book?.rating || 0) >= 4;

  container.innerHTML = `
    <div class="book-details">
      <div class="book-cover-wrap">
        <img src="${cover}" alt="${title}" loading="eager" decoding="async" referrerpolicy="no-referrer"
             width="300" height="400"
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
      </div>

      <div class="book-info">
        <h1>${title}</h1>
        <div class="author">By ${authorName}</div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin:0.5rem 0 0.2rem;">
          ${isBestseller ? '<span class="badge badge-success">Bestseller</span>' : ''}
          ${isTopRated ? '<span class="badge badge-warning">Top Rated</span>' : ''}
        </div>
        <div class="price">$${price}</div>
        <div class="rating" id="book-average-rating">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${ratingCount} reviews)</div>
        <div class="muted" style="margin-top:0.35rem;">Sold ${salesCount} time${salesCount === 1 ? '' : 's'}</div>

        <div class="description">
          <h3>Description</h3>
          <p>${description}</p>
        </div>

        <div class="genre"><strong>Genre:</strong> ${genre}</div>

        ${
          !hasPrice || !hasPdf
            ? `<p class="alert alert-info">This book is not available for purchase at the moment.</p>`
            : !user
            ? `<p class="alert alert-info">Please <a href="/login">login</a> to purchase this book.</p>`
            : isCustomer
            ? `
                <button class="btn btn-primary" onclick="buyNow('${book._id}')" style="margin-right: 0.5rem;">Buy Now</button>
                <button class="btn btn-secondary" onclick="addToCart('${book._id}')">Add to Cart</button>
              `
            : ''
        }

        ${isCustomer && token ? `<div id="book-download-section" style="margin-top: 1rem;"></div>` : ''}
        <div id="book-rating-section" style="margin-top: 1.5rem;"></div>
      </div>
    </div>
  `;

  loadPurchasedBookActions(book);
  loadRatingSection(book);
}

async function loadPurchasedBookActions(book) {
  const section = document.getElementById('book-download-section');
  if (!section || !book?._id) return;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user || user.role !== 'customer') {
    section.innerHTML = '';
    return;
  }

  try {
    const status = await booksAPI.getRatingStatus(book._id);
    if (!status?.hasPurchased) {
      section.innerHTML = '';
      return;
    }

    section.innerHTML = `
      <div class="alert alert-info" style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap;">
        <span>You purchased this book. You can download it and rate it below.</span>
        <button type="button" class="btn btn-primary btn-small" onclick="downloadPurchasedBook('${book._id}')">Download PDF</button>
      </div>
    `;
  } catch (error) {
    console.error('Error loading purchased book actions:', error);
    section.innerHTML = '';
  }
}

function downloadPurchasedBook(bookId) {
  if (!bookId) return;
  const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
  if (!token) {
    alert('Please log in to download this book.');
    return;
  }

  const base = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '').replace(/\/+$/, '');
  const url = `${base}/books/${bookId}/download`;

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(async (res) => {
      if (!res.ok) {
        let message = 'Download failed.';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch (_) {}
        throw new Error(message);
      }
      return res.blob();
    })
    .then((blob) => {
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'book.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    })
    .catch((error) => {
      console.error('Error downloading purchased book:', error);
      alert(error.message || 'Download failed.');
    });
}


async function loadRatingSection(book) {
  const section = document.getElementById('book-rating-section');
  if (!section || !book?._id) return;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) {
    section.innerHTML = '<p class="alert alert-info">Log in as a customer to rate this book after purchase.</p>';
    return;
  }

  if (user.role !== 'customer') {
    section.innerHTML = '';
    return;
  }

  try {
    const status = await booksAPI.getRatingStatus(book._id);

    if (!status?.canRate) {
      section.innerHTML = `<p class="alert alert-info">${status?.message || 'Only customers who purchased this book can rate it.'}</p>`;
      return;
    }

    const currentRating = Number(status?.existingRating || 0);
    const helperText = currentRating
      ? `Your current rating: ${currentRating}/5. Click another star to update it.`
      : 'Rate this book:';

    section.innerHTML = `
      <div class="rating-panel" style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; margin-top: 1rem;">
        <h3 style="margin-bottom: 0.5rem;">Rate this book</h3>
        <p id="rating-helper-text" style="margin-bottom: 0.75rem; color: #666;">${helperText}</p>
        <div id="rating-stars" style="display: flex; gap: 0.35rem; flex-wrap: wrap;"></div>
        <p id="rating-status-message" style="margin-top: 0.75rem;"></p>
      </div>
    `;

    renderRatingStars(book._id, currentRating);
  } catch (error) {
    console.error('Error loading rating section:', error);
    section.innerHTML = '<p class="alert alert-error">Unable to load rating options right now.</p>';
  }
}

function renderRatingStars(bookId, selectedRating) {
  const starsWrap = document.getElementById('rating-stars');
  if (!starsWrap) return;

  let html = '';
  for (let i = 1; i <= 5; i += 1) {
    const isActive = i <= selectedRating;
    html += `
      <button
        type="button"
        class="rating-star-btn"
        data-rating="${i}"
        aria-label="Rate ${i} star${i > 1 ? 's' : ''}"
        style="border: 1px solid #d1d5db; background: ${isActive ? '#111827' : '#fff'}; color: ${isActive ? '#fff' : '#111827'}; border-radius: 10px; padding: 0.55rem 0.8rem; cursor: pointer; font-size: 1rem;"
      >${'★'.repeat(i)}</button>
    `;
  }

  starsWrap.innerHTML = html;

  starsWrap.querySelectorAll('.rating-star-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ratingValue = Number(btn.getAttribute('data-rating'));
      await submitBookRating(bookId, ratingValue);
    });
  });
}

async function submitBookRating(bookId, ratingValue) {
  const msg = document.getElementById('rating-status-message');
  const helper = document.getElementById('rating-helper-text');
  if (msg) msg.textContent = 'Saving your rating...';

  try {
    const result = await booksAPI.rateBook(bookId, ratingValue);
    renderRatingStars(bookId, ratingValue);

    if (helper) {
      helper.textContent = `Your current rating: ${ratingValue}/5. Click another star to update it.`;
    }

    if (msg) {
      msg.textContent = result?.message || 'Rating saved successfully.';
      msg.style.color = '#166534';
    }

    const avg = document.getElementById('book-average-rating');
    if (avg) {
      const rounded = Math.round(Number(result?.rating || 0));
      const count = Number(result?.ratingCount || 0);
      avg.textContent = `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)} (${count} reviews)`;
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
    if (msg) {
      msg.textContent = error.message || 'Failed to save rating.';
      msg.style.color = '#b91c1c';
    }
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
  window.location.href = '/checkout';
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartLink = document.querySelector('a[href="/cart"]');
  if (!cartLink) return;

  const count = cart.length;
  cartLink.textContent = count > 0 ? `Cart (${count})` : 'Cart';
}

/* =========================
   GENRES (Filter)
========================= */
async function loadGenres() {
  try {
    const select = document.getElementById('genre-filter');
    if (!select) return;

    // Keep genres already hard-coded in HTML.
    // This prevents JS from wiping out the full list that already exists in /store.
    const existingValues = Array.from(select.options || [])
      .map((option) => String(option.value || '').trim())
      .filter(Boolean);

    let genres = [];
    if (booksAPI && typeof booksAPI.getGenres === 'function') {
      genres = await booksAPI.getGenres();
    }

    if ((!Array.isArray(genres) || !genres.length) && typeof getBookGenres === 'function') {
      genres = getBookGenres();
    }

    if (!Array.isArray(genres) || !genres.length) {
      return;
    }

    const uniqueGenres = genres
      .map((genre) => String(genre || '').trim())
      .filter(Boolean)
      .filter((genre, index, arr) => arr.indexOf(genre) === index)
      .sort((a, b) => a.localeCompare(b));

    uniqueGenres.forEach((genre) => {
      if (existingValues.includes(genre)) return;
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading genres:', error);
  }
}

/* =========================
   CURATED / FEATURED
========================= */
async function loadCuratedBooks() {
  const container = document.getElementById('curated-books') || document.getElementById('curated-books-store');
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
          <div class="book-card" onclick="window.location.href='/book-details?id=${book._id}'">
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
  if (document.getElementById('curated-books') || document.getElementById('curated-books-store')) {
    loadCuratedBooks();
  }

  // 4) Genres filter (if present)
  if (document.getElementById('genre-filter')) {
    loadGenres();
  }
});