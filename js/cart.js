let currentCartBooks = [];
let currentCartCoupon = null; // last successful coupon application

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
    currentCartCoupon = null;
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
      currentCartCoupon = null;
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

    displayCartItems(books, currentCartCoupon);
    calculateTotal(books, currentCartCoupon);
  } catch (error) {
    console.error('Error loading cart:', error);
    document.getElementById('cart-items').innerHTML =
      '<p class="alert alert-error">Error loading cart. Please try again.</p>';
  }
}

// Display cart items (with optional per-book discounts)
function displayCartItems(books, couponData) {
  const container = document.getElementById('cart-items');
  if (!container) return;

  let discountMap = {};
  if (couponData && couponData.success && Array.isArray(couponData.discountedItems)) {
    discountMap = couponData.discountedItems.reduce((acc, item) => {
      acc[item.bookId] = item;
      return acc;
    }, {});
  }

  container.innerHTML = books.map(book => {
    const discountInfo = discountMap[book._id] || null;
    const originalPrice = Number(book.price || 0);
    const discountedPrice = discountInfo ? Number(discountInfo.discountedPrice || originalPrice) : originalPrice;
    const perBookDiscount = discountInfo ? Number(discountInfo.discountAmount || 0) : 0;
    const hasDiscount = perBookDiscount > 0.0001;

    return `
      <div class="cart-item">
        <img src="${fileUrl(book.coverImage)}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/100x120?text=No+Cover'">
        <div class="cart-item-info">
          <h3>${book.title}</h3>
          <p>${book.author?.name || 'Unknown Author'}</p>
        </div>
        <div class="cart-item-price">
          ${hasDiscount ? `
            <div style="text-decoration: line-through; color:#999;">$${originalPrice.toFixed(2)}</div>
            <div style="color:#28a745; font-weight:bold;">$${discountedPrice.toFixed(2)}</div>
            <div style="font-size:0.85rem; color:#28a745;">- $${perBookDiscount.toFixed(2)}</div>
          ` : `
            <div>$${originalPrice.toFixed(2)}</div>
          `}
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

// Calculate total (with optional coupon)
function calculateTotal(books, couponData) {
  const subtotal = books.reduce((sum, book) => sum + Number(book.price || 0), 0);
  const subtotalEl = document.getElementById('cart-subtotal');
  const discountRow = document.getElementById('cart-discount-row');
  const discountAmountEl = document.getElementById('cart-discount-amount');
  const totalEl = document.getElementById('cart-total');
  const discountedItemsEl = document.getElementById('cart-discounted-items');

  let discountAmount = 0;
  let discountHtml = '';

  if (couponData && couponData.success) {
    const code = couponData.discountCode;
    const percentage = couponData.discountPercentage;
    discountAmount = Number(couponData.discountAmount || 0);

    discountHtml = `
      <p style="margin: 0.25rem 0;">
        Applied code <strong>${code}</strong> (${percentage}% off).
      </p>
    `;
  }

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

  if (discountRow && discountAmountEl) {
    if (discountAmount > 0) {
      discountRow.style.display = 'flex';
      discountAmountEl.textContent = `- $${discountAmount.toFixed(2)}`;
    } else {
      discountRow.style.display = 'none';
      discountAmountEl.textContent = '';
    }
  }

  if (discountedItemsEl) discountedItemsEl.innerHTML = discountHtml;

  const total = subtotal - discountAmount;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

  document.getElementById('cart-summary').style.display = 'block';
}

// Apply coupon from cart page
async function applyCartCoupon() {
  const input = document.getElementById('cart-coupon-input');
  const messageEl = document.getElementById('cart-coupon-message');

  if (!input || !messageEl) return;

  const code = input.value.trim();
  messageEl.textContent = '';
  messageEl.style.color = '';

  if (!code) {
    currentCartCoupon = null;
    displayCartItems(currentCartBooks, currentCartCoupon);
    calculateTotal(currentCartBooks, currentCartCoupon);
    messageEl.textContent = 'No code entered. You will pay full price.';
    messageEl.style.color = '#555';
    return;
  }

  if (!currentCartBooks || currentCartBooks.length === 0) {
    messageEl.textContent = 'Cart is empty.';
    messageEl.style.color = 'red';
    return;
  }

  // Coupon apply requires login (backend endpoint is protected)
  if (!isAuthenticated()) {
    currentCartCoupon = null;
    messageEl.textContent = 'Please login to apply a discount code.';
    messageEl.style.color = 'red';
    setTimeout(() => { window.location.href = 'login.html'; }, 600);
    return;
  }

  try {
    const bookIds = currentCartBooks.map(b => b._id);
    const result = await checkoutAPI.applyCoupon({ code, bookIds });

    if (result.success) {
      currentCartCoupon = result;
      messageEl.textContent = `Code applied: ${result.discountPercentage}% off. You save $${Number(result.discountAmount || 0).toFixed(2)}.`;
      messageEl.style.color = 'green';
    } else {
      currentCartCoupon = null;
      messageEl.textContent = result.message || 'Invalid or expired code.';
      messageEl.style.color = 'red';
    }

    displayCartItems(currentCartBooks, currentCartCoupon);
    calculateTotal(currentCartBooks, currentCartCoupon);
  } catch (error) {
    currentCartCoupon = null;
    messageEl.textContent = error.message || 'Error applying coupon code.';
    messageEl.style.color = 'red';
    displayCartItems(currentCartBooks, currentCartCoupon);
    calculateTotal(currentCartBooks, currentCartCoupon);
  }
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
  if (window.location.pathname.includes('cart.html')) {
    loadCart();
  }
});
