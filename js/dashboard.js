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
async async function loadAuthorDashboard() {
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

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

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
        <div class="value">${data.books}</div>
      </div>
      <div class="kpi">
        <div class="label">Total Sales</div>
        <div class="value">${data.totalSales}</div>
      </div>
      <div class="kpi">
        <div class="label">Total Earnings</div>
        <div class="value">$${data.totalEarnings}</div>
      </div>
      <div class="kpi">
        <div class="label">Unpaid Earnings</div>
        <div class="value">$${data.unpaidEarnings}</div>
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
          <div style="font-weight:900; color:#0052cc;">${data.adminPaymentEmail || 'blueleafbooks@hotmail.com'}</div>
        </div>

        <div>
          <div class="muted" style="font-size:0.9rem;">Trial status</div>
          <div style="font-weight:800;">
            ${data.isInFirst30Days
              ? `Free period: ${data.daysUntilFee} day(s) left (ends ${fmtDate(data.trialEndsAt) || '-'})`
              : `Trial ended on ${fmtDate(data.trialEndsAt) || '-'}`
            }
          </div>
        </div>
      </div>

      <div class="fee-grid">
        <div class="fee-box">
          <div class="muted" style="font-size:0.9rem;">Amount due (last month)</div>
          <div class="fee-amount">${data.isInFirst30Days ? '$0.00' : `$${Number(data.lastMonth?.feeDue || 0).toFixed(2)}`}</div>
          <div class="muted" style="font-size:0.9rem; margin-top:0.25rem;">
            Period: ${data.lastMonth?.period || '-'} · Due by: ${fmtDate(data.lastMonth?.dueDate) || '-'}
            ${data.lastMonth?.overdue ? '<span class="badge badge-danger" style="margin-left:0.4rem;">OVERDUE</span>' : ''}
          </div>
          <div style="margin-top:0.35rem;">
            Status:
            ${data.lastMonth?.status?.isPaid
              ? '<span class="badge badge-success">PAID</span>'
              : '<span class="badge badge-warning">UNPAID</span>'}
          </div>
        </div>

        <div class="fee-box">
          <div class="muted" style="font-size:0.9rem;">Current month (accrued)</div>
          <div class="fee-amount">${data.isInFirst30Days ? '$0.00' : `$${Number(data.currentMonth?.feeAccrued || 0).toFixed(2)}`}</div>
          <div class="muted" style="font-size:0.9rem; margin-top:0.25rem;">
            Period: ${data.currentMonth?.period || '-'} · Due by: ${fmtDate(data.currentMonth?.dueDate) || '-'}
          </div>
          <div class="muted" style="font-size:0.9rem; margin-top:0.35rem;">
            Only sales after your trial ends are counted.
          </div>
        </div>
      </div>
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
    </div>
  `;            }).join('')}
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
            const isDeleted = book.isDeleted;
            const status = (book.status || '').toLowerCase();
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
                    alt="${book.title}"
                    loading="lazy"
                    decoding="async"
                    onerror="this.onerror=null;this.src='https://via.placeholder.com/52x66?text=No+Cover';"
                  >
                </td>
                <td>${isDeleted ? '[DELETED] ' + book.title : book.title}</td>
                <td>${book.genre || '-'}</td>
                <td>$${Number(book.price || 0).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>${book.salesCount || 0}</td>
                <td>
                  ${!isDeleted
                    ? `<button class="btn btn-secondary btn-small" onclick="editBook('${book._id}')">Edit</button>`
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
      // revert UI if needed
      return;
    }
  } catch (err) {
    console.error(err);
    alert('Error updating featured settings');
  }
}
