// Build a full file URL for cover/pdf paths coming from backend
function fileUrl(path) {
  if (path == null || path === '') return '';
  const p = String(path).trim();
  if (!p) return '';
  // If backend already returns full URL, use as-is
  if (/^https?:\/\//i.test(p)) return p;
  const base = (typeof FILE_BASE_URL !== 'undefined' ? FILE_BASE_URL : (window.FILE_BASE_URL || '')) || 'https://blueleafbooks-backend-geum.onrender.com';
  return `${base.replace(/\/$/, '')}/${p.replace(/^\/+/, '')}`;
}

// Display books in grid
function displayBooks(books, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = '<p class="loading">No books found.</p>';
    return;
  }

  const PLACEHOLDER = 'https://via.placeholder.com/250x300?text=No+Cover';
  container.innerHTML = books.map(book => {
    const cover = fileUrl(book?.coverImage) || PLACEHOLDER;
    const title = book.title || 'Untitled';
    const authorName = book.author?.name || 'Unknown Author';
    const price = Number(book.price || 0).toFixed(2);
    const rating = Math.floor(Number(book.rating || 0));
    const ratingCount = Number(book.ratingCount || 0);

    return `
      <div class="book-card" onclick="window.location.href='book-details.html?id=${book._id}'">
        <img src="${cover}" alt="${title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
        <div class="book-card-content">
          <div class="book-card-title">${title}</div>
          <div class="book-card-author">${authorName}</div>
          <div class="book-card-price">$${price}</div>
          <div class="book-card-rating">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${ratingCount})</div>
        </div>
      </div>
    `;
  }).join('');
}

// Load and display books
async function loadBooks(params = {}) {
  try {
    const books = await booksAPI.getAll(params);
    displayBooks(books, 'books-container');
  } catch (error) {
    console.error('Error loading books:', error);
    const el = document.getElementById('books-container');
    if (el) {
      el.innerHTML = '<p class="alert alert-error">Error loading books. Please try again.</p>';
    }
  }
}

// Load book details
async function loadBookDetails(bookId) {
  try {
    const book = await booksAPI.getById(bookId);
    displayBookDetails(book);
  } catch (error) {
    console.error('Error loading book details:', error);
    const container = document.querySelector('.book-details-container');
    if (container) {
      container.innerHTML = '<p class="alert alert-error">Book not found.</p>';
    }
  }
}

// Display book details
function displayBookDetails(book) {
  const container = document.querySelector('.book-details-container');
  if (!container) return;

  const user = getCurrentUser();
  const isCustomer = user && user.role === 'customer';
  const hasPrice = !!(book.price && Number(book.price) > 0);
  const hasPdf = !!book.pdfFile;

  const PLACEHOLDER = 'https://via.placeholder.com/300x400?text=No+Cover';
  const cover = fileUrl(book?.coverImage) || PLACEHOLDER;

  container.innerHTML = `
    <div class="book-details">
      <div class="book-cover-wrap">
        <img src="${cover}" alt="${book.title}" loading="eager" decoding="async" width="300" height="400" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
      </div>
      <div class="book-info">
        <h1>${book.title}</h1>
        <div class="author">By ${book.author?.name || 'Unknown Author'}</div>
        <div class="price">$${Number(book.price || 0).toFixed(2)}</div>
        <div class="rating">${'★'.repeat(Math.floor(Number(book.rating || 0)))}${'☆'.repeat(5 - Math.floor(Number(book.rating || 0)))} (${Number(book.ratingCount || 0)} reviews)</div>
        <div class="description">
          <h3>Description</h3>
          <p>${book.description || ''}</p>
        </div>
        <div class="genre"><strong>Genre:</strong> ${book.genre || ''}</div>

        ${!hasPrice || !hasPdf ? `
          <p class="alert alert-info">This book is not available for purchase at the moment.</p>
        ` : !user ? `
          <p class="alert alert-info">Please <a href="login.html">login</a> to purchase this book.</p>
        ` : isCustomer ? `
          <button class="btn btn-primary" onclick="buyNow('${book._id}')" style="margin-right: 0.5rem;">Buy Now</button>
          <button class="btn btn-secondary" onclick="addToCart('${book._id}')">Add to Cart</button>
        ` : ''}
      </div>
    </div>
  `;
}

// Add to cart
function addToCart(bookId) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');

  if (cart.includes(bookId)) {
    alert('This book is already in your cart!');
    return;
  }

  cart.push(bookId);
  localStorage.setItem('cart', JSON.stringify(cart));
  alert('Book added to cart!');
  updateCartCount();
}

// Buy Now: add to cart and go to checkout
function buyNow(bookId) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');

  if (!cart.includes(bookId)) {
    cart.push(bookId);
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  updateCartCount();
  window.location.href = 'checkout.html';
}

// Update cart count in navigation
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartLink = document.querySelector('a[href="cart.html"]');
  if (cartLink) {
    const count = cart.length;
    cartLink.textContent = count > 0 ? `Cart (${count})` : 'Cart';
  }
}

// Load genres for filter
async function loadGenres() {
  try {
    const genres = await booksAPI.getGenres();
    const select = document.getElementById('genre-filter');
    if (select) {
      select.innerHTML =
        '<option value="">All Genres</option>' +
        (Array.isArray(genres) ? genres.map(g => `<option value="${g}">${g}</option>`).join('') : '');
    }
  } catch (error) {
    console.error('Error loading genres:', error);
  }
}

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
});


// Load curated featured books into any container that exists
async function loadCuratedBooks() {
  const container = document.getElementById('curated-books');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/books/featured/curated`);
    const books = await res.json();
    if (!Array.isArray(books) || books.length === 0) {
      container.innerHTML = '<p class="muted">No featured books yet.</p>';
      return;
    }

    const PLACEHOLDER = 'https://via.placeholder.com/250x300?text=No+Cover';
    container.innerHTML = books.map(book => {
      const cover = fileUrl(book?.coverImage) || PLACEHOLDER;
      const title = book.title || 'Untitled';
      const authorName = book.author?.name || 'Unknown Author';
      const price = Number(book.price || 0).toFixed(2);
      return `
        <div class="book-card" onclick="window.location.href='book-details.html?id=${book._id}'">
          <img src="${cover}" alt="${title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
          <div class="book-card-content">
            <div class="book-card-title">${title}</div>
            <div class="book-card-author">${authorName}</div>
            <div class="book-card-price">$${price}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p class="muted">Failed to load featured books.</p>';
  }
}
