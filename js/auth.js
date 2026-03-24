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
function requireAuth(redirectTo = '/login') {
  if (!isAuthenticated()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Redirect if not specific role
function requireRole(role, redirectTo = '/') {
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
  window.location.href = '/';
}

// Update navigation based on auth status
function updateNavigation() {
  const user = getCurrentUser();
  const navLinks = document.querySelector('.nav-links');
  
  if (!navLinks) return;

  // Show/hide any header links that point to the author onboarding page.
  // Guests and authors can see them; customers and admins should not.
  const shouldHideForAuthorsLink = !!(user && (user.role === 'customer' || user.role === 'admin'));
  const forAuthorsAnchors = navLinks.querySelectorAll('a[href="/for-authors"]');
  forAuthorsAnchors.forEach(anchor => {
    const item = anchor.closest('li');
    if (item) item.style.display = shouldHideForAuthorsLink ? 'none' : '';
    else anchor.style.display = shouldHideForAuthorsLink ? 'none' : '';
  });
  
  // Clear existing auth links
  const existingAuthLinks = navLinks.querySelectorAll('.auth-link');
  existingAuthLinks.forEach(link => link.remove());
  
  if (user) {
    // User is logged in
    const userMenu = document.createElement('li');
    userMenu.className = 'auth-link';
    
    let dashboardLink = '';
    if (user.role === 'customer') {
      dashboardLink = '<a href="/customer-dashboard">My Library</a>';
    } else if (user.role === 'author') {
      dashboardLink = '<a href="/author-dashboard">Author Dashboard</a>';
    } else if (user.role === 'admin') {
      dashboardLink = '<a href="/admin-dashboard">Admin Dashboard</a>';
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
    loginLink.innerHTML = '<a href="/login">Login</a>';
    
    const registerLink = document.createElement('li');
    registerLink.className = 'auth-link';
    registerLink.innerHTML = '<a href="/register">Register</a>';
    
    navLinks.appendChild(loginLink);
    navLinks.appendChild(registerLink);
  }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();
});
