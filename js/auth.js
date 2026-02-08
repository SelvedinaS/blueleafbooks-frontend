// Check if user is authenticated
function isAuthenticated() {
  return !!getAuthToken();
}

// Check if user has specific role
function hasRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

// Redirect if not authenticated
function requireAuth(redirectTo = 'login.html') {
  if (!isAuthenticated()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Redirect if not specific role
function requireRole(role, redirectTo = 'index.html') {
  if (!hasRole(role)) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Logout
function logout() {
  removeAuthToken();
  removeCurrentUser();
  window.location.href = 'index.html';
}

// Update navigation based on auth status
function updateNavigation() {
  const user = getCurrentUser();
  const navLinks = document.querySelector('.nav-links');
  
  if (!navLinks) return;
  
  // Clear existing auth links
  const existingAuthLinks = navLinks.querySelectorAll('.auth-link');
  existingAuthLinks.forEach(link => link.remove());
  
  if (user) {
    // User is logged in
    const userMenu = document.createElement('li');
    userMenu.className = 'auth-link';
    
    let dashboardLink = '';
    if (user.role === 'customer') {
      dashboardLink = '<a href="customer-dashboard.html">My Library</a>';
    } else if (user.role === 'author') {
      dashboardLink = '<a href="author-dashboard.html">Author Dashboard</a>';
    } else if (user.role === 'admin') {
      dashboardLink = '<a href="admin-dashboard.html">Admin Dashboard</a>';
    }
    
    userMenu.innerHTML = `
      <span style="margin-right: 1rem;">Hello, ${user.name}</span>
      ${dashboardLink}
      <a href="#" onclick="logout(); return false;" style="margin-left: 1rem;">Logout</a>
    `;
    
    navLinks.appendChild(userMenu);
  } else {
    // User is not logged in
    const loginLink = document.createElement('li');
    loginLink.className = 'auth-link';
    loginLink.innerHTML = '<a href="login.html">Login</a>';
    
    const registerLink = document.createElement('li');
    registerLink.className = 'auth-link';
    registerLink.innerHTML = '<a href="register.html">Register</a>';
    
    navLinks.appendChild(loginLink);
    navLinks.appendChild(registerLink);
  }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();
});
