// Dashboard logic (customer / author / admin)

// Helper: mobile breakpoint
function isMobileView() {
  return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
}

// Safe file URL helper (prevents crashes if missing elsewhere)
function fileUrl(path) {
  try {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    // FILE_BASE_URL should exist globally (set in your main.js / config)
    if (typeof FILE_BASE_URL === 'undefined') return String(path);
    return `${FILE_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
  } catch {
    return String(path || '');
  }
}

// Simple debounce
function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Cache last loaded data so we can re-render on resize without refetch
let _lastViewMode = isMobileView() ? 'mobile' : 'desktop';
let _authorCache = null; // dashboard object
let _adminCache = null;  // {books, authors, orders, earnings}
let _customerCache = null; // orders array

// Init by page
document.addEventListener('DOMContentLoaded', () => {
  const path = (window.location.pathname || '').toLowerCase();

  if (path.includes('customer-dashboard')) {
    loadCustomerDashboard();
  } else if (path.includes('author-dashboard')) {
    loadAuthorDashboard();
  } else if (path.includes('admin-dashboard')) {
    loadAdminDashboard();
  }

  // Re-render UI when switching between mobile/desktop width
  window.addEventListener('resize', debounce(() => {
    const mode = isMobileView() ? 'mobile' : 'desktop';
    if (mode === _lastViewMode) return;
    _lastViewMode = mode;

    const p = (window.location.pathname || '').toLowerCase();
    if (p.includes('customer-dashboard') && _customerCache) {
      displayMyLibrary(_customerCache);
    } else if (p.includes('author-dashboard') && _authorCache) {
      displayAuthorDashboard(_authorCache);
    } else if (p.includes('admin-dashboard') && _adminCache) {
      displayAdminDashboard(_adminCache);
    }
  }, 200));
});

/* =========================
   CUSTOMER DASHBOARD
========================= */
async function loadCustomerDashboard() {
  if (!requireAuth()) return;
  if (!requireRole('customer')) return;

  try {
    const orders = await ordersAPI.getMyOrders();
    _customerCache = Array.isArray(orders) ? orders : [];
    displayMyLibrary(_customerCache);
  } catch (error) {
    console.error('Error loading customer dashboard:', error);
    const el = document.getElementById('dashboard-content');
    if (el) el.innerHTML = '<p class="alert alert-error">Error loading your library. Please try again.</p>';
  }
}

function displayMyLibrary(orders) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const purchasedBooks = [];
  (orders || []).forEach(order => {
    if (order?.paymentStatus === 'completed') {
      (order.items || []).forEach(item => {
        if (!item?.book) return;
        purchasedBooks.push({
          ...item.book,
          purchaseDate: order.createdAt,
          orderId: order._id
        });
      });
    }
  });

  const allOrders = (orders || []).filter(o => !!o);
  const orderHistoryHtml = allOrders.length > 0 ? `
    <div class="section-card" style="margin-top: 2rem;">
      <h2 style="font-size: 1.25rem; margin-bottom: 1rem;">Order History</h2>
      <p class="muted" style="margin-bottom: 1rem;">All your orders and their payment status.</p>
      ${isMobileView() ? `
        <div class="mobile-cards">
          ${allOrders.map(o => {
            const status = (o.paymentStatus || 'pending').toLowerCase();
            const statusClass = status === 'completed' ? 'badge-success' : status === 'failed' ? 'badge-danger' : 'badge-warning';
            const itemsCount = (o.items || []).length;
            return `
              <div class="mobile-card">
                <div class="mobile-card-header">
                  <div>
                    <div class="mobile-card-title">Order ${(o._id || '').substring(0, 8)}...</div>
                    <div class="mobile-card-subtitle">$${Number(o.totalAmount || 0).toFixed(2)} · ${itemsCount} book(s) · <span class="badge ${statusClass}">${status}</span></div>
                  </div>
                  <div class="mobile-card-actions">
                    <button class="mobile-toggle" type="button">Details</button>
                  </div>
                </div>
                <div class="mobile-card-details">
                  <div class="mobile-kv"><span class="k">Date</span><span class="v">${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}</span></div>
                  <div class="mobile-kv"><span class="k">Status</span><span class="v"><span class="badge ${statusClass}">${status}</span></span></div>
                  <div class="mobile-kv"><span class="k">Total</span><span class="v">$${Number(o.totalAmount || 0).toFixed(2)}</span></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="table-wrap"><table>
          <thead><tr><th>Order ID</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            ${allOrders.map(o => {
              const status = (o.paymentStatus || 'pending').toLowerCase();
              const statusClass = status === 'completed' ? 'badge-success' : status === 'failed' ? 'badge-danger' : 'badge-warning';
              return `<tr>
                <td>${(o._id || '').substring(0, 8)}...</td>
                <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}</td>
                <td>${(o.items || []).length} book(s)</td>
                <td>$${Number(o.totalAmount || 0).toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      `}
    </div>
  ` : '';

  if (purchasedBooks.length === 0 && allOrders.length === 0) {
    container.innerHTML = `<p class="alert alert-info">You haven't purchased any books yet. <a href="store.html">Browse books</a></p>`;
    return;
  }

  container.innerHTML = `
    <h2>My Library</h2>
    ${purchasedBooks.length === 0 ? '<p class="alert alert-info">No books in your library yet. <a href="store.html">Browse books</a></p>' : `
    <div class="books-grid">
      ${purchasedBooks.map(book => `
        <div class="book-card">
          <img src="${fileUrl(book.coverImage)}" alt="${book.title || 'Book'}"
               onerror="this.onerror=null;this.src='https://via.placeholder.com/250x300?text=No+Cover'">
          <div class="book-card-content">
            <div class="book-card-title">${book.title || '-'}</div>
            <div class="book-card-author">${book.author?.name || 'Unknown Author'}</div>
            <p style="font-size: 0.9rem; color: #666; margin: 0.5rem 0;">Purchased: ${book.purchaseDate ? new Date(book.purchaseDate).toLocaleDateString() : '-'}</p>
            <a href="${fileUrl(book.pdfFile)}" class="btn btn-primary btn-small" download>Download PDF</a>
          </div>
        </div>
      `).join('')}
    </div>
    `}
    ${orderHistoryHtml}
  `;

  if (isMobileView()) wireMobileToggles();
}

/* =========================
   AUTHOR DASHBOARD
========================= */
async function loadAuthorDashboard() {
  if (!requireAuth()) return;
  if (!requireRole('author')) return;

  try {
    const dashboard = await authorsAPI.getDashboard();
    _authorCache = dashboard || {};
    await displayAuthorDashboard(_authorCache);
  } catch (error) {
    console.error('Error loading author dashboard:', error);
    const el = document.getElementById('dashboard-content');
    if (el) el.innerHTML = '<p class="alert alert-error">Error loading dashboard. Please try again.</p>';
  }
}

// Display author dashboard (Pro UI + reports + payout settings)
async function displayAuthorDashboard(data) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  // Load payout settings
  let payoutEmail = '';
  try {
    const payoutSettings = await authorsAPI.getPayoutSettings();
    payoutEmail = payoutSettings?.payoutPaypalEmail || '';
  } catch (error) {
    console.error('Error loading payout settings:', error);
  }

  const fmtDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const money = (n) => `$${Number(n || 0).toFixed(2)}`;

  const adminEmail = data.adminPaymentEmail || 'blueleafbooks@hotmail.com';
  const isTrial = !!data.isInFirst30Days;

  const lastMonthFee = isTrial ? '$0.00' : money(data.lastMonth?.feeDue);
  const currentMonthAccrued = isTrial ? '$0.00' : money(data.currentMonth?.feeAccrued);

  const lastMonthPeriod = data.lastMonth?.period || '-';
  const lastMonthDue = fmtDate(data.lastMonth?.dueDate);
  const lastMonthOverdue = !!data.lastMonth?.overdue;
  const lastMonthPaid = !!data.lastMonth?.status?.isPaid;

  const currentMonthPeriod = data.currentMonth?.period || '-';
  const currentMonthDue = fmtDate(data.currentMonth?.dueDate);

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="page-title">Overview</div>
        <div class="page-subtitle">Your books, sales, and platform fee status.</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">Total Books</div>
        <div class="value">${Number(data.books || 0)}</div>
      </div>
      <div class="kpi">
        <div class="label">Total Sales</div>
        <div class="value">${Number(data.totalSales || 0)}</div>
      </div>
      <div class="kpi">
        <div class="label">Total Earnings</div>
        <div class="value">${money(data.totalEarnings)}</div>
      </div>
      <div class="kpi">
        <div class="label">Unpaid Earnings</div>
        <div class="value">${money(data.unpaidEarnings)}</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Platform Fee (10%)</h2>
      </div>

      <p class="muted">
        First 30 days are free. After that, the fee is calculated per calendar month.
        You pay the <strong>previous month</strong> by the <strong>10th of the next month</strong>.
      </p>

      <div class="btn-row" style="margin-top:0.75rem;">
        <div>
          <div class="muted" style="font-size:0.9rem;">Payment email</div>
          <div style="font-weight:900; color:#0052cc;">${adminEmail}</div>
        </div>

        <div>
          <div class="muted" style="font-size:0.9rem;">Trial status</div>
          <div style="font-weight:800;">
            ${
              isTrial
                ? `Free period: ${Number(data.daysUntilFee || 0)} day(s) left (ends ${fmtDate(data.trialEndsAt)})`
                : `Trial ended on ${fmtDate(data.trialEndsAt)}`
            }
          </div>
        </div>
      </div>

      <div class="fee-grid">
        <div class="fee-box">
          <div class="muted" style="font-size:0.9rem;">Amount due (last month)</div>
          <div class="fee-amount">${lastMonthFee}</div>
          <div class="muted" style="font-size:0.9rem; margin-top:0.25rem;">
            Period: ${lastMonthPeriod} · Due by: ${lastMonthDue}
            ${lastMonthOverdue ? '<span class="badge badge-danger" style="margin-left:0.4rem;">OVERDUE</span>' : ''}
          </div>
          <div style="margin-top:0.35rem;">
            Status:
            ${lastMonthPaid ? '<span class="badge badge-success">PAID</span>' : '<span class="badge badge-warning">UNPAID</span>'}
          </div>
        </div>

        <div class="fee-box">
          <div class="muted" style="font-size:0.9rem;">Current month (accrued)</div>
          <div class="fee-amount">${currentMonthAccrued}</div>
          <div class="muted" style="font-size:0.9rem; margin-top:0.25rem;">
            Period: ${currentMonthPeriod} · Due by: ${currentMonthDue}
          </div>
          <div class="muted" style="font-size:0.9rem; margin-top:0.35rem;">
            Only sales after your trial ends are counted.
          </div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Payout Settings</h2>
      </div>
      <div id="payout-settings-alert"></div>
      <div class="form-group" style="max-width:520px;">
        <label for="payout-paypal-email">Your PayPal email (required – money goes directly to you)</label>
        <input
          id="payout-paypal-email"
          type="email"
          placeholder="your-paypal@email.com"
          value="${String(payoutEmail || '').replace(/"/g, '&quot;')}"
        />
      </div>
      <button class="btn btn-primary" type="button" onclick="savePayoutSettings()">Save payout settings</button>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>My Books</h2>
        <a href="author-upload.html" class="btn btn-primary">Upload new book</a>
      </div>
      <div id="author-books-list"></div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Monthly Reports</h2>
      </div>
      <p class="muted">
        Download a PDF report of your monthly earnings, including each sale, platform fee (10%), and your net income.
        This report is for your records and tax reporting.
      </p>
      <div id="author-reports-alert"></div>
      <div class="reports-row">
        <div class="form-group" style="max-width: 140px;">
          <label for="author-report-month">Month</label>
          <select id="author-report-month"></select>
        </div>
        <div class="form-group" style="max-width: 140px;">
          <label for="author-report-year">Year</label>
          <select id="author-report-year"></select>
        </div>
        <button id="author-download-report" class="btn btn-secondary" type="button">Download PDF</button>
      </div>

      <p class="muted" style="font-size:0.9rem; margin-top:0.75rem;">
        Note: BlueLeafBooks is not responsible for your taxes. Authors are fully responsible for reporting and paying their own taxes.
      </p>
    </div>
  `;

  // Hook report button
  const btn = document.getElementById('author-download-report');
  if (btn) btn.onclick = downloadAuthorMonthlyReport;

  // Populate month/year dropdowns
  const monthSelect = document.getElementById('author-report-month');
  const yearSelect = document.getElementById('author-report-year');

  if (monthSelect && monthSelect.options.length === 0) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = String(m);
      opt.textContent = String(m).padStart(2, '0');
      if (m === currentMonth) opt.selected = true;
      monthSelect.appendChild(opt);
    }
  }

  if (yearSelect && yearSelect.options.length === 0) {
    const y = new Date().getFullYear();
    for (let i = 0; i < 6; i++) {
      const opt = document.createElement('option');
      opt.value = String(y - i);
      opt.textContent = String(y - i);
      if (i === 0) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }

  displayAuthorBooks(data.booksList || []);
}

// Download monthly earnings PDF for author
async function downloadAuthorMonthlyReport() {
  const alertContainer = document.getElementById('author-reports-alert');
  if (alertContainer) alertContainer.innerHTML = '';

  const monthEl = document.getElementById('author-report-month');
  const yearEl = document.getElementById('author-report-year');
  const month = parseInt(monthEl?.value || '', 10);
  const year = parseInt(yearEl?.value || '', 10);

  if (!month || !year) {
    if (alertContainer) {
      alertContainer.innerHTML = '<div class="alert alert-error">Please select a valid month and year.</div>';
    } else {
      alert('Please select a valid month and year.');
    }
    return;
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/authors/reports/monthly/${year}/${month}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to generate report');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const monthPadded = String(month).padStart(2, '0');
    link.href = url;
    link.download = `blueleafbooks-earnings-${year}-${monthPadded}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading author report:', error);
    if (alertContainer) {
      alertContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    } else {
      alert('Error downloading report: ' + error.message);
    }
  }
}

// Save payout settings
async function savePayoutSettings() {
  const alertContainer = document.getElementById('payout-settings-alert');
  const emailInput = document.getElementById('payout-paypal-email');
  const email = (emailInput?.value || '').trim();

  if (alertContainer) alertContainer.innerHTML = '';

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (alertContainer) alertContainer.innerHTML = '<div class="alert alert-error">Please enter a valid email address</div>';
      return;
    }
  }

  try {
    await authorsAPI.updatePayoutSettings({ payoutPaypalEmail: email });
    if (alertContainer) alertContainer.innerHTML = '<div class="alert alert-success">Payout settings saved successfully!</div>';
  } catch (error) {
    if (alertContainer) alertContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  }
}

// Mobile: toggle details
function wireMobileToggles() {
  document.querySelectorAll('.mobile-toggle').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.mobile-card');
      if (!card) return;
      card.classList.toggle('is-open');
      e.currentTarget.textContent = card.classList.contains('is-open') ? 'Hide' : 'Details';
    });
  });
}

// Display author books
function displayAuthorBooks(books) {
  const container = document.getElementById('author-books-list');
  if (!container) return;

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = `<p class="alert alert-info">You haven't uploaded any books yet.</p>`;
    return;
  }

  if (isMobileView()) {
    container.innerHTML = `
      <div class="mobile-cards">
        ${books.map(book => {
          const isDeleted = !!book.isDeleted;
          const status = String(book.status || '').toLowerCase();
          const statusLabel = isDeleted
            ? 'Deleted by admin'
            : status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Unknown';

          const badgeClass = isDeleted
            ? 'badge-danger'
            : status === 'approved'
              ? 'badge-success'
              : status === 'pending'
                ? 'badge-warning'
                : 'badge-danger';

          return `
            <div class="mobile-card">
              <div class="mobile-card-header">
                <div>
                  <div class="mobile-card-title">${isDeleted ? '[DELETED] ' : ''}${book.title || '-'}</div>
                  <div class="mobile-card-subtitle">
                    <span class="badge ${badgeClass}">${statusLabel}</span>
                    <span style="margin-left:8px;">$${Number(book.price || 0).toFixed(2)}</span>
                    <span style="margin-left:8px;">Sales: ${Number(book.salesCount || 0)}</span>
                  </div>
                </div>
                <div class="mobile-card-actions">
                  <button class="mobile-toggle" type="button">Details</button>
                  ${!isDeleted ? `<button class="btn btn-secondary btn-small" type="button" onclick="editBook('${book._id}')">Edit</button>` : ''}
                </div>
              </div>

              <div class="mobile-card-details">
                <div class="mobile-kv"><div class="k">Genre</div><div class="v">${book.genre || '-'}</div></div>
                <div class="mobile-kv"><div class="k">Price</div><div class="v">$${Number(book.price || 0).toFixed(2)}</div></div>
                <div class="mobile-kv"><div class="k">Sales</div><div class="v">${Number(book.salesCount || 0)}</div></div>
                <div style="margin-top:10px; display:flex; gap:10px; align-items:center;">
                  <img
                    src="${fileUrl(book.coverImage)}"
                    alt="${book.title || 'Cover'}"
                    style="width:64px;height:80px;object-fit:cover;border-radius:10px;"
                    loading="lazy"
                    decoding="async"
                    onerror="this.onerror=null;this.src='https://via.placeholder.com/64x80?text=No+Cover';"
                  >
                  <div class="muted" style="font-size:0.9rem;">
                    ${isDeleted ? 'This book was deleted by admin.' : 'Tap Edit to update this book.'}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    wireMobileToggles();
    return;
  }

  // Desktop table
  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cover</th>
            <th>Title</th>
            <th>Genre</th>
            <th>Price</th>
            <th>Status</th>
            <th>Sales</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${books.map(book => {
            const isDeleted = !!book.isDeleted;
            const status = String(book.status || '').toLowerCase();
            const statusLabel = isDeleted
              ? 'Deleted by admin'
              : status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Unknown';

            const badgeClass = isDeleted
              ? 'badge-danger'
              : status === 'approved'
                ? 'badge-success'
                : status === 'pending'
                  ? 'badge-warning'
                  : 'badge-danger';

            return `
              <tr>
                <td>
                  <img
                    src="${fileUrl(book.coverImage)}"
                    alt="${book.title || 'Cover'}"
                    loading="lazy"
                    decoding="async"
                    onerror="this.onerror=null;this.src='https://via.placeholder.com/52x66?text=No+Cover';"
                  >
                </td>
                <td>${isDeleted ? '[DELETED] ' + (book.title || '-') : (book.title || '-')}</td>
                <td>${book.genre || '-'}</td>
                <td>$${Number(book.price || 0).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>${Number(book.salesCount || 0)}</td>
                <td>
                  ${!isDeleted
                    ? `<button class="btn btn-secondary btn-small" type="button" onclick="editBook('${book._id}')">Edit</button>`
                    : `<span class="muted" style="font-size:0.85rem;">This book was deleted by admin</span>`
                  }
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Edit book
function editBook(bookId) {
  window.location.href = `author-upload.html?id=${bookId}`;
}

/* =========================
   ADMIN DASHBOARD
========================= */
async function loadAdminDashboard() {
  if (!requireAuth()) return;
  if (!requireRole('admin')) return;

  try {
    const [books, authors, orders, earnings] = await Promise.all([
      adminAPI.getAllBooks('all'),
      adminAPI.getAllAuthors(),
      adminAPI.getAllOrders(),
      adminAPI.getEarnings()
    ]);

    _adminCache = {
      books: books || [],
      authors: authors || [],
      orders: orders || [],
      earnings: earnings || {}
    };

    displayAdminDashboard(_adminCache);
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    const el = document.getElementById('dashboard-content');
    if (el) el.innerHTML = '<p class="alert alert-error">Error loading dashboard. Please try again.</p>';
  }
}

function displayAdminDashboard(data) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const booksArr = Array.isArray(data.books) ? data.books : [];
  const authorsArr = Array.isArray(data.authors) ? data.authors : [];
  const pendingBooks = booksArr.filter(b => String(b.status || '').toLowerCase() === 'pending');

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Books</h3>
        <div class="value">${booksArr.length}</div>
      </div>
      <div class="stat-card">
        <h3>Pending Approval</h3>
        <div class="value">${pendingBooks.length}</div>
      </div>
      <div class="stat-card">
        <h3>Total Authors</h3>
        <div class="value">${authorsArr.length}</div>
      </div>
      <div class="stat-card">
        <h3>Platform Earnings</h3>
        <div class="value">$${Number(data.earnings?.totalEarnings || 0).toFixed(2)}</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Pending Books</h2>
      </div>
      <div id="pending-books"></div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Authors</h2>
      </div>
      <div id="authors-table"></div>
    </div>
  `;

  displayPendingBooks(pendingBooks);
  displayAuthorsTable(authorsArr);
}

function displayAuthorsTable(authors) {
  const container = document.getElementById('authors-table');
  if (!container) return;

  if (!Array.isArray(authors) || authors.length === 0) {
    container.innerHTML = '<p class="alert alert-info">No authors found.</p>';
    return;
  }

  if (isMobileView()) {
    container.innerHTML = `
      <div class="mobile-cards">
        ${authors.map(a => {
          const status = a.isBlocked ? 'Blocked' : 'Active';
          const blockedAt = a.blockedAt ? new Date(a.blockedAt).toLocaleString() : '-';
          const reason = a.blockedReason ? a.blockedReason : '-';
          return `
            <div class="mobile-card">
              <div class="mobile-card-header">
                <div>
                  <div class="mobile-card-title">${a.name || '—'}</div>
                  <div class="mobile-card-subtitle">
                    <span class="badge ${a.isBlocked ? 'badge-danger' : 'badge-success'}">${status}</span>
                    <span style="margin-left:8px;">${a.email || '—'}</span>
                  </div>
                </div>
                <div class="mobile-card-actions">
                  <button class="mobile-toggle" type="button">Details</button>
                  ${a.isBlocked
                    ? `<button class="btn btn-success btn-small" type="button" onclick="unblockAuthor('${a._id}')">Unblock</button>`
                    : `<button class="btn btn-danger btn-small" type="button" onclick="blockAuthorPrompt('${a._id}')">Block</button>`
                  }
                </div>
              </div>

              <div class="mobile-card-details">
                <div class="mobile-kv"><div class="k">PayPal</div><div class="v">${a.payoutPaypalEmail || '—'}</div></div>
                <div class="mobile-kv"><div class="k">Reason</div><div class="v">${reason}</div></div>
                <div class="mobile-kv"><div class="k">Blocked at</div><div class="v">${blockedAt}</div></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    wireMobileToggles();
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Author</th>
            <th>Email</th>
            <th>PayPal</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Blocked At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${authors.map(a => {
            const status = a.isBlocked ? 'Blocked' : 'Active';
            const blockedAt = a.blockedAt ? new Date(a.blockedAt).toLocaleString() : '-';
            const reason = a.blockedReason ? a.blockedReason : '-';
            return `
              <tr>
                <td>${a.name || '—'}</td>
                <td>${a.email || '—'}</td>
                <td>${a.payoutPaypalEmail || '—'}</td>
                <td><span class="badge ${a.isBlocked ? 'badge-danger' : 'badge-success'}">${status}</span></td>
                <td>${reason}</td>
                <td>${blockedAt}</td>
                <td>
                  ${a.isBlocked
                    ? `<button class="btn btn-success btn-small" type="button" onclick="unblockAuthor('${a._id}')">Unblock</button>`
                    : `<button class="btn btn-danger btn-small" type="button" onclick="blockAuthorPrompt('${a._id}')">Block</button>`
                  }
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function displayPendingBooks(books) {
  const container = document.getElementById('pending-books');
  if (!container) return;

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = '<p class="alert alert-info">No pending books.</p>';
    return;
  }

  if (isMobileView()) {
    container.innerHTML = `
      <div class="mobile-cards">
        ${books.map(book => `
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <div class="mobile-card-title">${book.title || '-'}</div>
                <div class="mobile-card-subtitle">${book.author?.name || 'Unknown'} · $${Number(book.price || 0).toFixed(2)}</div>
              </div>
              <div class="mobile-card-actions">
                <button class="mobile-toggle" type="button">Details</button>
                <button class="btn btn-success btn-small" type="button" onclick="approveBook('${book._id}')">Approve</button>
                <button class="btn btn-danger btn-small" type="button" onclick="rejectBook('${book._id}')">Reject</button>
              </div>
            </div>
            <div class="mobile-card-details">
              <div class="mobile-kv"><div class="k">Genre</div><div class="v">${book.genre || '-'}</div></div>
              <div style="margin-top:10px; display:flex; gap:10px; align-items:center;">
                <img src="${fileUrl(book.coverImage)}" alt="${book.title || 'Cover'}"
                     style="width:64px;height:80px;object-fit:cover;border-radius:10px;"
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/64x80?text=No+Cover'">
                <div class="muted" style="font-size:0.9rem;">Tap Approve/Reject.</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    wireMobileToggles();
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cover</th>
            <th>Title</th>
            <th>Author</th>
            <th>Genre</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${books.map(book => `
            <tr>
              <td>
                <img src="${fileUrl(book.coverImage)}" alt="${book.title || 'Cover'}"
                     style="width: 50px; height: 60px; object-fit: cover; border-radius: 8px;"
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/50x60?text=No+Cover'">
              </td>
              <td>${book.title || '-'}</td>
              <td>${book.author?.name || 'Unknown'}</td>
              <td>${book.genre || '-'}</td>
              <td>$${Number(book.price || 0).toFixed(2)}</td>
              <td>
                <button class="btn btn-success btn-small" type="button" onclick="approveBook('${book._id}')">Approve</button>
                <button class="btn btn-danger btn-small" type="button" onclick="rejectBook('${book._id}')">Reject</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function approveBook(bookId) {
  try {
    await adminAPI.updateBookStatus(bookId, 'approved');
    alert('Book approved successfully');
    loadAdminDashboard();
  } catch (error) {
    alert('Error approving book: ' + error.message);
  }
}

async function rejectBook(bookId) {
  if (!confirm('Are you sure you want to reject this book?')) return;

  try {
    await adminAPI.updateBookStatus(bookId, 'rejected');
    alert('Book rejected');
    loadAdminDashboard();
  } catch (error) {
    alert('Error rejecting book: ' + error.message);
  }
}

async function blockAuthorPrompt(authorId) {
  const reason = prompt('Reason for blocking (optional):', 'Unpaid platform fee');
  try {
    await adminAPI.blockAuthor(authorId, reason || 'Unpaid platform fee');
    alert('Author blocked. Their books are now hidden and they cannot publish new ones.');
    loadAdminDashboard();
  } catch (error) {
    alert('Error blocking author: ' + error.message);
  }
}

async function unblockAuthor(authorId) {
  try {
    await adminAPI.unblockAuthor(authorId);
    alert('Author unblocked.');
    loadAdminDashboard();
  } catch (error) {
    alert('Error unblocking author: ' + error.message);
  }
}

// Admin: update curated featured flag/order for a book
async function updateFeatured(bookId) {
  try {
    const token = getAuthToken();
    if (!token) {
      alert('Please login again.');
      return;
    }

    const checkbox = document.getElementById(`feat-${bookId}`);
    const orderInput = document.getElementById(`featOrder-${bookId}`);

    const isFeatured = !!checkbox?.checked;
    const featuredOrder = Math.max(0, parseInt(orderInput?.value || '0', 10) || 0);

    const res = await fetch(`${API_BASE_URL}/admin/books/${bookId}/featured`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isFeatured, featuredOrder })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || 'Failed to update featured settings');
      return;
    }
  } catch (err) {
    console.error(err);
    alert('Error updating featured settings');
  }
}