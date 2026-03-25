let currentCartBooks = [];

function fileUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILE_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

// Load cart items
async function loadCart() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  if (cart.length === 0) {
    document.getElementById('cart-items').innerHTML =
      '<p class="alert alert-info">Your cart is empty. <a href="store.html">Browse books</a></p>';
    document.getElementById('cart-summary').style.display = 'none';
    currentCartBooks = [];
    return;
  }

  try {
    // ✅ Validate cart items using correct API base
    const books = await fetch(`${API_BASE_URL}/cart/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookIds: cart })
    }).then(res => res.json());

    // ✅ Robustness: backend must return an array
    if (!Array.isArray(books)) {
      const msg = (books && (books.message || books.error)) ? (books.message || books.error) : 'Invalid response from server.';
      throw new Error(msg);
    }

    // ✅ If nothing comes back, the cart likely contains stale IDs (e.g., DB reset)
    if (books.length === 0) {
      localStorage.setItem('cart', JSON.stringify([]));
      currentCartBooks = [];
      document.getElementById('cart-items').innerHTML =
        '<p class="alert alert-info">Your cart is empty (items were removed or no longer available). <a href="store.html">Browse books</a></p>';
      document.getElementById('cart-summary').style.display = 'none';
      updateCartCount();
      return;
    }

    currentCartBooks = books;

    // If some books are no longer returned (deleted or unavailable), remove them from cart
    const returnedIds = books.map(b => b._id);
    const removedIds = cart.filter(id => !returnedIds.includes(id));
    if (removedIds.length > 0) {
      const cleanedCart = cart.filter(id => returnedIds.includes(id));
      localStorage.setItem('cart', JSON.stringify(cleanedCart));
      alert('This book is no longer available and was removed from your cart.');
    }

    displayCartItems(books);
    calculateTotal(books);
  } catch (error) {
    console.error('Error loading cart:', error);
    document.getElementById('cart-items').innerHTML =
      '<p class="alert alert-error">Error loading cart. Please try again.</p>';
  }
}

// Display cart items (books only)
function displayCartItems(books) {
  const container = document.getElementById('cart-items');
  if (!container) return;

  container.innerHTML = books.map(book => {
    const price = Number(book.price || 0);
    return `
      <div class="cart-item">
        <img src="${fileUrl(book.coverImage)}" alt="${book.title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://via.placeholder.com/100x120?text=No+Cover'">
        <div class="cart-item-info">
          <h3>${book.title}</h3>
          <p>${book.author?.name || 'Unknown Author'}</p>
        </div>
        <div class="cart-item-price">
          <div>$${price.toFixed(2)}</div>
        </div>
        <button class="btn btn-danger btn-small" onclick="removeFromCart('${book._id}')">Remove</button>
      </div>
    `;
  }).join('');
}

// Remove from cart
function removeFromCart(bookId) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart = cart.filter(id => id !== bookId);
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
  updateCartCount();
}

// Calculate total
function calculateTotal(books) {
  const total = books.reduce((sum, book) => sum + Number(book.price || 0), 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  document.getElementById('cart-summary').style.display = 'block';
}

// Proceed to checkout
function proceedToCheckout() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }

  if (!isAuthenticated()) {
    alert('Please login to checkout');
    window.location.href = 'login.html';
    return;
  }

  window.location.href = 'checkout.html';
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
  // Netlify/redirects sometimes serve pretty URLs (e.g. /cart instead of /cart.html).
  // So we initialize the cart whenever the cart container exists.
  if (document.getElementById('cart-items')) {
    loadCart();
  }
});
