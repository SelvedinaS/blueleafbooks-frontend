const API_BASE_URL = 'https://blueleafbooks-backend.onrender.com/api';

// ✅ Base URL for serving files (images/pdfs) from the backend host
// Example: https://blueleafbooks-backend.onrender.com
const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem('token');
}

// Helper function to set auth token
function setAuthToken(token) {
  localStorage.setItem('token', token);
}

// Helper function to remove auth token
function removeAuthToken() {
  localStorage.removeItem('token');
}

// Helper function to get current user (safe)
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

// Helper function to set current user
function setCurrentUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Helper function to remove current user
function removeCurrentUser() {
  localStorage.removeItem('user');
}

/**
 * Safe JSON parser for fetch responses:
 * - reads res.text() first (works even if server returns HTML)
 * - throws meaningful error messages for non-OK responses
 * - allows empty body for OK responses (and 204)
 */
async function safeJson(res) {
  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      text.slice(0, 250) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // OK responses can be empty (return null)
  return data;
}

// API request helper (JSON endpoints)
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  return safeJson(response);
}

// Auth API
const authAPI = {
  register: (userData) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  getMe: () => apiRequest('/auth/me')
};

// Books API
const booksAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/books${queryString ? '?' + queryString : ''}`);
  },

  getById: (id) => apiRequest(`/books/${id}`),

  getGenres: () => apiRequest('/books/genres/list'),

  getBestsellers: () => apiRequest('/books/featured/bestsellers'),

  getNew: () => apiRequest('/books/featured/new'),

  // IMPORTANT: formData endpoints (do NOT set Content-Type manually)
  create: async (formData) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    return safeJson(res);
  },

  update: async (id, formData) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    return safeJson(res);
  },

  delete: (id) => apiRequest(`/books/${id}`, { method: 'DELETE' })
};

// Orders API
const ordersAPI = {
  create: (orderData) =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    }),

  getMyOrders: () => apiRequest('/orders/my-orders'),

  getById: (id) => apiRequest(`/orders/${id}`)
};

// PayPal API
const paypalAPI = {
  createOrder: (data) =>
    apiRequest('/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  captureOrder: (orderId) =>
    apiRequest('/paypal/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    })
};

// Authors API
const authorsAPI = {
  getDashboard: () => apiRequest('/authors/dashboard'),

  getMyBooks: () => apiRequest('/authors/my-books'),

  getPayoutSettings: () => apiRequest('/authors/payout-settings'),

  updatePayoutSettings: (data) =>
    apiRequest('/authors/payout-settings', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// Checkout API
const checkoutAPI = {
  applyCoupon: (data) =>
    apiRequest('/checkout/apply-coupon', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// Admin API
const adminAPI = {
  updateBookStatus: (id, status) =>
    apiRequest(`/admin/books/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  getAllBooks: (status) =>
    apiRequest(`/admin/books${status ? '?status=' + status : ''}`),

  deleteBook: (id) =>
    apiRequest(`/admin/books/${id}`, {
      method: 'DELETE'
    }),

  getAllAuthors: () => apiRequest('/admin/authors'),

  getAllOrders: () => apiRequest('/admin/orders'),

  getEarnings: () => apiRequest('/admin/earnings'),

  getPayouts: () => apiRequest('/admin/payouts'),

  markPayoutPaid: (data) =>
    apiRequest('/admin/payouts/mark-paid', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Coupon management
  getAllCoupons: () => apiRequest('/admin/coupons'),

  createCoupon: (data) =>
    apiRequest('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  toggleCoupon: (id) =>
    apiRequest(`/admin/coupons/${id}/toggle`, {
      method: 'PATCH'
    }),

  deleteCoupon: (id) =>
    apiRequest(`/admin/coupons/${id}`, {
      method: 'DELETE'
    })
};
