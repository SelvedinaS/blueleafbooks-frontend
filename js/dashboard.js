function fileUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILE_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

// Load customer dashboard (My Library)
async function loadCustomerDashboard() {
  if (!requireAuth()) return;
  if (!requireRole('customer')) return;

  try {
    const orders = await ordersAPI.getMyOrders();
    displayMyLibrary(orders);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    const el = document.getElementById('dashboard-content');
    if (el) el.innerHTML = '<p class="alert alert-error">Error loading your library. Please try again.</p>';
  }
}

// Display my library
function displayMyLibrary(orders) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const purchasedBooks = [];
  orders.forEach(order => {
    if (order.paymentStatus === 'completed') {
      order.items.forEach(item => {
        if (!item.book) return;
        purchasedBooks.push({
          ...item.book,
          purchaseDate: order.createdAt,
          orderId: order._id
        });
      });
    }
  });

  if (purchasedBooks.length === 0) {
    container.innerHTML = '<p class="alert alert-info">You haven\'t purchased any books yet. <a href="store.html">Browse books</a></p>';
    return;
  }

  container.innerHTML = `
    <h2>My Library</h2>
    <div class="books-grid">
      ${purchasedBooks.map(book => `
        <div class="book-card">
          <img src="${fileUrl(book.coverImage)}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/250x300?text=No+Cover'">
          <div class="book-card-content">
            <div class="book-card-title">${book.title}</div>
            <div class="book-card-author">${book.author?.name || 'Unknown Author'}</div>
            <p style="font-size: 0.9rem; color: #666; margin: 0.5rem 0;">Purchased: ${new Date(book.purchaseDate).toLocaleDateString()}</p>
            <a href="${fileUrl(book.pdfFile)}" class="btn btn-primary btn-small" download>Download PDF</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Load author dashboard
async function loadAuthorDashboard() {
  if (!requireAuth()) return;
  if (!requireRole('author')) return;

  try {
    const dashboard = await authorsAPI.getDashboard();
    displayAuthorDashboard(dashboard);
  } catch (error) {
    console.error('Error loading author dashboard:', error);
    const el = document.getElementById('dashboard-content');
    if (el) el.innerHTML = '<p class="alert alert-error">Error loading dashboard. Please try again.</p>';
  }
}

// Display author dashboard
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

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Books</h3>
        <div class="value">${data.books}</div>
      </div>
      <div class="stat-card">
        <h3>Total Sales</h3>
        <div class="value">${data.totalSales}</div>
      </div>
      <div class="stat-card">
        <h3>Total Earnings</h3>
        <div class="value">$${data.totalEarnings}</div>
      </div>
      <div class="stat-card">
        <h3>Unpaid Earnings</h3>
        <div class="value">$${data.unpaidEarnings}</div>
      </div>
    </div>

    <div style="margin-top: 2rem; background: var(--white); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h2 style="margin-bottom: 1rem;">Payout Settings</h2>
      <p style="color: #666; margin-bottom: 1rem;">Configure your PayPal email address to receive payouts. Payouts are processed manually once per month.</p>
      <div id="payout-settings-alert"></div>
      <div class="form-group" style="max-width: 500px;">
        <label for="payout-paypal-email">PayPal Payout Email</label>
        <input type="email" id="payout-paypal-email" name="payoutPaypalEmail" value="${payoutEmail}" placeholder="your-email@example.com">
      </div>
      <button class="btn btn-primary" onclick="savePayoutSettings()">Save</button>
    </div>

    <h2 style="margin-top: 2rem;">My Books</h2>
    <a href="author-upload.html" class="btn btn-primary" style="margin-bottom: 1rem;">Upload New Book</a>
    <div id="author-books-list"></div>

    <div style="margin-top: 2rem; background: var(--white); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h2 style="margin-bottom: 0.75rem;">Monthly Reports</h2>
      <p style="color: #666; margin-bottom: 1rem;">
        Download a PDF report of your monthly earnings, including each sale, platform fee (10%), and your net income.
        This report is for your records and tax reporting.
      </p>
      <div id="author-reports-alert"></div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end;">
        <div class="form-group" style="max-width: 120px;">
          <label for="author-report-month">Month</label>
          <select id="author-report-month">
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
              const now = new Date();
              const selected = (m === (now.getMonth() + 1)) ? 'selected' : '';
              return `<option value="${m}" ${selected}>${m}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-group" style="max-width: 140px;">
          <label for="author-report-year">Year</label>
          <input type="number" id="author-report-year" min="2000" max="2100" value="${new Date().getFullYear()}" />
        </div>
        <button class="btn btn-primary" onclick="downloadAuthorMonthlyReport()">Download PDF</button>
      </div>
      <p style="color:#999; font-size:0.9rem; margin-top:0.75rem;">
        Note: BlueLeafBooks is not responsible for your taxes. Authors are fully responsible for reporting and paying their own taxes.
      </p>
    </div>
  `;

  displayAuthorBooks(data.booksList);
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

// Display author books
function displayAuthorBooks(books) {
  const container = document.getElementById('author-books-list');
  if (!container) return;

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = '<p class="alert alert-info">You haven\'t uploaded any books yet.</p>';
    return;
  }

  container.innerHTML = `
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
          const isDeleted = book.isDeleted;
          const statusLabel = isDeleted
            ? 'Deleted by admin'
            : book.status.charAt(0).toUpperCase() + book.status.slice(1);

          const bgColor = isDeleted
            ? '#e2e3e5'
            : book.status === 'approved'
              ? '#d4edda'
              : book.status === 'pending'
                ? '#fff3cd'
                : '#f8d7da';

          const textColor = isDeleted
            ? '#6c757d'
            : book.status === 'approved'
              ? '#155724'
              : book.status === 'pending'
                ? '#856404'
                : '#721c24';

          return `
            <tr>
              <td>
                <img src="${fileUrl(book.coverImage)}" alt="${book.title}"
                     style="width: 50px; height: 60px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/50x60?text=No+Cover'">
              </td>
              <td>${isDeleted ? '[DELETED] ' + book.title : book.title}</td>
              <td>${book.genre}</td>
              <td>$${Number(book.price || 0).toFixed(2)}</td>
              <td>
                <span style="padding: 0.3rem 0.6rem; border-radius: 3px; font-size: 0.85rem;
                  background-color: ${bgColor};
                  color: ${textColor};">
                  ${statusLabel}
                </span>
              </td>
              <td>${book.salesCount}</td>
              <td>
                ${!isDeleted ? `
                  <button class="btn btn-secondary btn-small" onclick="editBook('${book._id}')">Edit</button>
                ` : '<span style="font-size:0.85rem; color:#6c757d;">This book has been deleted by admin</span>'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Edit book
function editBook(bookId) {
  window.location.href = `author-upload.html?id=${bookId}`;
}

// Load admin dashboard
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

    displayAdminDashboard({ books, authors, orders, earnings });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    const el = document.getElementById('dashboard-content');
    if (el) el.innerHTML = '<p class="alert alert-error">Error loading dashboard. Please try again.</p>';
  }
}

// Display admin dashboard
function displayAdminDashboard(data) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const pendingBooks = data.books.filter(b => b.status === 'pending');

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Books</h3>
        <div class="value">${data.books.length}</div>
      </div>
      <div class="stat-card">
        <h3>Pending Approval</h3>
        <div class="value">${pendingBooks.length}</div>
      </div>
      <div class="stat-card">
        <h3>Total Authors</h3>
        <div class="value">${data.authors.length}</div>
      </div>
      <div class="stat-card">
        <h3>Platform Earnings</h3>
        <div class="value">$${data.earnings.totalEarnings}</div>
      </div>
    </div>

    <div style="margin-top: 2rem;">
      <h2>Pending Books</h2>
      <div id="pending-books"></div>
    </div>
  `;

  displayPendingBooks(pendingBooks);
  displayAuthorsTable(data.authors);
}


// Display authors table (admin)
function displayAuthorsTable(authors) {
  const container = document.getElementById('authors-table');
  if (!container) return;

  if (!Array.isArray(authors) || authors.length === 0) {
    container.innerHTML = '<p class="alert alert-info">No authors found.</p>';
    return;
  }

  container.innerHTML = `
    <div style="overflow:auto;">
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
                    ? `<button class="btn btn-success btn-small" onclick="unblockAuthor('${a._id}')">Unblock</button>`
                    : `<button class="btn btn-danger btn-small" onclick="blockAuthorPrompt('${a._id}')">Block</button>`
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

// Display pending books
function displayPendingBooks(books) {
  const container = document.getElementById('pending-books');
  if (!container) return;

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = '<p class="alert alert-info">No pending books.</p>';
    return;
  }

  container.innerHTML = `
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
              <img src="${fileUrl(book.coverImage)}" alt="${book.title}"
                   style="width: 50px; height: 60px; object-fit: cover;"
                   onerror="this.src='https://via.placeholder.com/50x60?text=No+Cover'">
            </td>
            <td>${book.title}</td>
            <td>${book.author?.name || 'Unknown'}</td>
            <td>${book.genre}</td>
            <td>$${Number(book.price || 0).toFixed(2)}</td>
            <td>
              <button class="btn btn-success btn-small" onclick="approveBook('${book._id}')">Approve</button>
              <button class="btn btn-danger btn-small" onclick="rejectBook('${book._id}')">Reject</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Approve book
async function approveBook(bookId) {
  try {
    await adminAPI.updateBookStatus(bookId, 'approved');
    alert('Book approved successfully');
    loadAdminDashboard();
  } catch (error) {
    alert('Error approving book: ' + error.message);
  }
}

// Reject book
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


// Block author prompt
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

// Unblock author
async function unblockAuthor(authorId) {
  try {
    await adminAPI.unblockAuthor(authorId);
    alert('Author unblocked.');
    loadAdminDashboard();
  } catch (error) {
    alert('Error unblocking author: ' + error.message);
  }
}

