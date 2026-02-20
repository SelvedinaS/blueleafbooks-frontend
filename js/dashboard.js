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
            ${
              lastMonthPaid
                ? '<span class="badge badge-success">PAID</span>'
                : '<span class="badge badge-warning">UNPAID</span>'
            }
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
        <label for="payout-paypal-email">Your PayPal email (optional)</label>
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
  if (btn) {
    btn.onclick = downloadAuthorMonthlyReport;
  }

  // Populate month/year dropdowns (simple, stable)
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

  displayAuthorBooks(data.booksList);
}