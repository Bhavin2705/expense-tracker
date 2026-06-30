// =============================================
// Dashboard Page Logic
// =============================================

(function () {
  'use strict';

  const dashboardState = {
    range: 'this_month',
    dateFrom: '',
    dateTo: '',
    categories: []
  };

  const CAT_COLORS = [
    { bg: '#edfcf9', color: '#0f766e' },
    { bg: '#eff6ff', color: '#1d4ed8' },
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#fce7f3', color: '#9d174d' },
    { bg: '#f5f3ff', color: '#5b21b6' },
    { bg: '#ecfdf5', color: '#065f46' }
  ];

  function money(value) {
    return 'Rs. ' + Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function isoDate(value) {
    return value ? new Date(value).toISOString().slice(0, 10) : '';
  }

  function catStyle(index) {
    const c = CAT_COLORS[index % CAT_COLORS.length];
    return `background:${c.bg};color:${c.color}`;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const item = document.createElement('div');
    item.className = `toast toast-${type}`;
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => item.remove(), 2800);
  }

  function buildStatCard(label, value, note, accentClass = '') {
    return `
      <div class="stat-card">
        <div class="stat-card-accent ${accentClass}"></div>
        <div class="stat-label">${esc(label)}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-delta">${esc(note)}</div>
      </div>`;
  }

  function rangeParams() {
    const params = { range: dashboardState.range };
    if (dashboardState.range === 'custom') {
      params.dateFrom = dashboardState.dateFrom;
      params.dateTo = dashboardState.dateTo;
    }
    return params;
  }

  function renderStats(data) {
    const changeNote = data.changePercent === null
      ? 'No previous period'
      : (data.changePercent > 0 ? '+' : '') + data.changePercent + '% vs previous';

    document.getElementById('statsGrid').innerHTML =
      buildStatCard('Period Spending', money(data.totalExpenses), data.period?.label || '', '') +
      buildStatCard('Previous Period', money(data.previousPeriodExpenses), changeNote, data.changePercent > 0 ? 'accent-red' : 'accent-blue') +
      buildStatCard('Daily Average', money(data.dailyAverage), 'Avg per day', 'accent-amber') +
      buildStatCard('Expense Count', String(data.expenseCount || 0), 'Transactions', 'accent-blue');
  }

  function renderCategories(data) {
    const cats = data.topCategories || [];
    const container = document.getElementById('topCategories');

    if (!cats.length) {
      container.innerHTML = `<div class="empty-state"><p class="empty-title">No category data</p><p class="empty-message">Add expenses to see breakdown</p></div>`;
      return;
    }

    container.innerHTML = cats.map((c, i) => {
      const pct = data.totalExpenses > 0 ? Math.round((Number(c.total) / data.totalExpenses) * 100) : 0;
      return `
        <div class="data-row">
          <div class="data-row-left">
            <div class="data-row-icon" style="${catStyle(i)}">${esc(c.icon || 'CAT')}</div>
            <div class="data-row-info">
              <div class="data-row-title">${esc(c.name || 'Uncategorised')}</div>
              <div class="data-row-sub">${pct}% of spending</div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            </div>
          </div>
          <div class="data-row-value">${money(c.total)}</div>
        </div>`;
    }).join('');
  }

  function renderTrend(items = []) {
    const el = document.getElementById('spendingTrend');
    if (!items.length) {
      el.innerHTML = `<div class="empty-state"><p class="empty-title">No trend data</p><p class="empty-message">Add more expenses</p></div>`;
      return;
    }

    const max = Math.max(...items.map(item => Number(item.total || 0))) || 1;
    el.innerHTML = items.map(item => {
      const height = Math.max(8, Math.round((Number(item.total) / max) * 160));
      return `
        <div class="trend-bar-wrap" title="${esc(item._id)}: ${money(item.total)}">
          <div class="trend-bar-value">${money(item.total)}</div>
          <div class="trend-bar" style="height:${height}px"></div>
          <div class="trend-bar-label">${esc(item._id)}</div>
        </div>`;
    }).join('');
  }

  function renderRecentExpenses(expenses = []) {
    const el = document.getElementById('recentExpenses');

    if (!expenses.length) {
      el.innerHTML = `
        <div class="empty-state">
          <p class="empty-title">No recent expenses</p>
          <p class="empty-message">Add your first expense</p>
          <button class="btn btn-sm btn-primary" id="emptyAddBtn">Add Expense</button>
        </div>`;
      document.getElementById('emptyAddBtn')?.addEventListener('click', openAddExpense);
      return;
    }

    el.innerHTML = expenses.map((expense, i) => {
      const cat = expense.categoryId?.name || 'Uncategorised';
      const icon = expense.categoryId?.icon || '💰';
      return `
        <button class="expense-item dashboard-expense-button" data-id="${esc(expense._id)}">
          <div class="expense-cat-dot" style="${catStyle(i)}">${esc(icon)}</div>
          <div class="expense-body">
            <div class="expense-title">${esc(expense.title)}</div>
            <div class="expense-meta">
              <span>${esc(cat)}</span>
              <span class="expense-meta-dot"></span>
              <span>${formatDate(expense.date)}</span>
            </div>
          </div>
          <div class="expense-amount">${money(expense.amount)}</div>
          <span class="badge badge-default">Edit</span>
        </button>`;
    }).join('');

    el.querySelectorAll('.dashboard-expense-button').forEach(btn => {
      btn.addEventListener('click', () => openEditExpense(btn.dataset.id));
    });
  }

  function renderRangeSummary(period) {
    const summaryEl = document.getElementById('rangeSummary');
    if (summaryEl) {
      summaryEl.textContent = `${period.label}: ${formatDate(period.startDate)} — ${formatDate(period.endDate)}`;
    }
  }

  async function loadDashboard() {
    const loading = document.getElementById('dashboardLoading');
    const errorEl = document.getElementById('dashboardError');
    const content = document.getElementById('dashboardContent');

    loading.style.display = 'flex';
    errorEl.classList.add('hidden');

    try {
      const res = await dashboardService.get(rangeParams());
      const data = res.data || {};

      renderRangeSummary(data.period || {});
      renderStats(data);
      renderCategories(data);
      renderTrend(data.spendingTrend || []);
      renderRecentExpenses(data.recentExpenses || []);
      content.classList.remove('hidden');
    } catch (err) {
      toast.show(err.message || "Failed to load dashboard", "error");
      document.getElementById('dashboardErrorMsg').textContent = err.message || 'Failed to load dashboard';
      errorEl.classList.remove('hidden');
    } finally {
      loading.style.display = 'none';
    }
  }

  // Modal Functions
  async function populateCategories() {
    try {
      const res = await categoryService.getAll();
      dashboardState.categories = res.data?.categories || [];
      const select = document.getElementById('expCategory');
      select.innerHTML = `<option value="">Select category</option>` +
        dashboardState.categories.map(cat =>
          `<option value="${esc(cat._id)}">${esc(cat.name)}</option>`
        ).join('');
    } catch (e) {
      console.warn('Failed to load categories');
    }
  }

  function openModal() {
    document.getElementById('expenseModalBackdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('expTitle').focus();
  }

  function closeModal() {
    document.getElementById('expenseModalBackdrop').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function resetExpenseForm() {
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseId').value = '';
    document.getElementById('expDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('expenseModalTitle').textContent = 'Add Expense';
    document.getElementById('expenseSaveBtn').textContent = 'Save Expense';
  }

  function openAddExpense() {
    populateCategories().then(() => {
      resetExpenseForm();
      openModal();
    });
  }

  function openEditExpense(id) {
    Promise.all([populateCategories(), expenseService.getOne(id)])
      .then(([_, res]) => {
        const expense = res.data?.expense || res.data;
        document.getElementById('expenseId').value = expense._id;
        document.getElementById('expTitle').value = expense.title || '';
        document.getElementById('expAmount').value = expense.amount || '';
        document.getElementById('expCategory').value = expense.categoryId?._id || expense.categoryId || '';
        document.getElementById('expDate').value = isoDate(expense.date);
        document.getElementById('expPayment').value = expense.paymentMethod || '';
        document.getElementById('expTags').value = (expense.tags || []).join(', ');
        document.getElementById('expDescription').value = expense.description || '';

        document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
        document.getElementById('expenseSaveBtn').textContent = 'Save Changes';
        openModal();
      })
      .catch(err => showToast(err.message || 'Could not load expense', 'error'));
  }

  function saveExpense() {
    const form = document.getElementById('expenseForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = document.getElementById('expenseId').value;
    const fd = new FormData();
    fd.append('title', document.getElementById('expTitle').value.trim());
    fd.append('amount', document.getElementById('expAmount').value);
    fd.append('categoryId', document.getElementById('expCategory').value);
    fd.append('date', document.getElementById('expDate').value);
    fd.append('paymentMethod', document.getElementById('expPayment').value);
    fd.append('tags', document.getElementById('expTags').value);
    fd.append('description', document.getElementById('expDescription').value.trim());

    const btn = document.getElementById('expenseSaveBtn');
    btn.disabled = true;
    btn.classList.add('btn-loading');

    const request = id
      ? expenseService.update(id, fd)
      : expenseService.create(fd);

    request.then(() => {
      closeModal();
      showToast(id ? 'Expense updated' : 'Expense added', 'success');
      loadDashboard();
    }).catch(err => {
      showToast(err.message || 'Failed to save', 'error');
    }).finally(() => {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    });
  }

  // Initialize Dashboard
  async function initDashboard() {
    const user = await auth.requireAuth();
    if (!user) return;

    // Theme
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('es-theme') || 'light';
    root.setAttribute('data-theme', savedTheme);

    document.getElementById('themeToggle').addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', newTheme);
      localStorage.setItem('es-theme', newTheme);
    });

    // Navigation
    const mobileNavBtn = document.getElementById('mobileNavBtn');
    mobileNavBtn.addEventListener('click', function () {
      const sidebar = document.getElementById('sidebar');
      const isOpen = sidebar.classList.toggle('open');
      mobileNavBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.getElementById('logoutBtn').addEventListener('click', auth.logout);

    // Sidebar profile navigation
    const sidebarUser = document.getElementById('sidebarUser');

    if (sidebarUser) {
      sidebarUser.style.cursor = 'pointer';

      sidebarUser.addEventListener('click', () => {
        window.location.href = '/profile.html';
      });
    }

    // Add Expense Buttons
    document.getElementById('topAddExpenseBtn').addEventListener('click', openAddExpense);
    document.getElementById('heroAddExpenseBtn').addEventListener('click', openAddExpense);

    // Modal handlers
    document.getElementById('expenseModalClose').addEventListener('click', closeModal);
    document.getElementById('expenseCancelBtn').addEventListener('click', closeModal);
    document.getElementById('expenseSaveBtn').addEventListener('click', saveExpense);
    document.getElementById('expenseModalBackdrop').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Range controls
    const presetSelect = document.getElementById('rangePreset');
    const customControls = document.getElementById('customRangeControls');

    presetSelect.addEventListener('change', () => {
      dashboardState.range = presetSelect.value;
      customControls.classList.toggle('hidden', dashboardState.range !== 'custom');
      if (dashboardState.range !== 'custom') loadDashboard();
    });

    document.getElementById('applyRangeBtn').addEventListener('click', () => {
      dashboardState.dateFrom = document.getElementById('dateFrom').value;
      dashboardState.dateTo = document.getElementById('dateTo').value;
      loadDashboard();
    });

    // Initial load
    loadDashboard();
  }

  // Public API
  window.dashboardPage = {
    init: initDashboard
  };

  // Auto init when loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }
})();