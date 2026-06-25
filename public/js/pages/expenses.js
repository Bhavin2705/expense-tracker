(function () {
  'use strict';

  var state = {
    page: 1,
    limit: 20,
    search: '',
    category: '',
    transactionType: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
    categories: [],
    currentExpenses: [],
    currentTotals: { grossTotal: 0, netTotal: 0, taxTotal: 0, tipTotal: 0 },
    deleteTarget: null,
    detailTarget: null,
    searchTimer: null,
    filtersExpanded: false,
    loadSeq: 0
  };

  var typeLabels = {
    expense: 'Expense',
    refund: 'Refund',
    reimbursement: 'Reimbursement'
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value, currency) {
    var num = Number(value || 0);
    var sign = num < 0 ? '-' : '';
    var abs = Math.abs(num);
    var code = currency || 'INR';
    var prefix = code === 'INR' ? 'Rs. ' : code + ' ';
    return sign + prefix + abs.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function signedAmount(expense) {
    var value = Number(expense.amount || 0);
    return ['refund', 'reimbursement'].includes(expense.transactionType) ? value * -1 : value;
  }

  function formatDate(value, options) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', options || { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function monthKey(value) {
    return new Date(value).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  function isoDate(value) {
    return value ? new Date(value).toISOString().slice(0, 10) : '';
  }

  function showToast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var item = document.createElement('div');
    item.className = 'toast toast-' + (type || 'info');
    item.textContent = message;
    container.appendChild(item);
    setTimeout(function () { item.remove(); }, 3000);
  }

  function setLoading(button, loading, label) {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('btn-loading', loading);
    if (label) button.textContent = loading ? 'Please wait...' : label;
  }

  function debounce(fn, delay) {
    return function () {
      var args = arguments;
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(function () { fn.apply(null, args); }, delay);
    };
  }

  function validateDateFilters() {
    var box = document.getElementById('filterError');
    if (!box) return true;
    box.style.display = 'none';
    box.textContent = '';

    if (state.dateFrom && state.dateTo && state.dateFrom > state.dateTo) {
      box.textContent = 'From date cannot be after To date.';
      box.style.display = 'flex';
      return false;
    }
    return true;
  }

  function params() {
    return {
      page: state.page,
      limit: state.limit,
      search: state.search,
      category: state.category,
      transactionType: state.transactionType,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder
    };
  }

  function renderSummary(total, pages) {
    var net = Number(state.currentTotals.netTotal || 0);
    var gross = Number(state.currentTotals.grossTotal || 0);
    var tax = Number(state.currentTotals.taxTotal || 0);
    var tip = Number(state.currentTotals.tipTotal || 0);

    var countLabel = total + ' record' + (total === 1 ? '' : 's');
    var extras = [];
    if (gross && gross !== Math.abs(net)) extras.push('Gross ' + money(gross));
    if (tax || tip) extras.push('Tax + tip ' + money(tax + tip));

    var html =
      '<div class="expense-summary-main">' +
      '<span class="expense-summary-label">Current view</span>' +
      '<strong>' + money(net) + '</strong>' +
      '</div>' +
      '<div class="expense-summary-meta">' +
      '<span>' + countLabel + '</span>' +
      '<span>Page ' + state.page + ' of ' + (pages || 1) + '</span>' +
      (extras.length ? '<span>' + esc(extras.join(' / ')) + '</span>' : '') +
      '</div>';

    var summaryEl = document.getElementById('summaryGrid');
    if (summaryEl) summaryEl.innerHTML = html;
  }

  function activeFilterCount() {
    var count = 0;
    ['search', 'category', 'transactionType', 'dateFrom', 'dateTo'].forEach(function (key) {
      if (state[key]) count += 1;
    });
    if (state.sortBy !== 'date' || state.sortOrder !== 'desc') count += 1;
    return count;
  }

  function renderFilterState() {
    var panel = document.getElementById('advancedFilters');
    var toggle = document.getElementById('filterToggleBtn');
    var clear = document.getElementById('clearFiltersBtn');
    var count = activeFilterCount();

    if (panel) panel.classList.toggle('hidden', !state.filtersExpanded);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(state.filtersExpanded));
      toggle.textContent = count ? 'Filters (' + count + ')' : 'Filters';
    }
    if (clear) clear.style.visibility = count ? 'visible' : 'hidden';
  }

  function categoryName(expense) {
    return expense.categoryId && expense.categoryId.name ? expense.categoryId.name : 'Uncategorised';
  }

  function categoryColor(expense) {
    return expense.categoryId && expense.categoryId.color ? expense.categoryId.color : '#0f766e';
  }

  function renderExpenseCard(expense) {
    var cat = categoryName(expense);
    var color = categoryColor(expense);
    var type = expense.transactionType || 'expense';
    var signed = signedAmount(expense);
    var tags = (expense.tags || []).slice(0, 3).map(function (tag) {
      return '<span class="tag-pill">' + esc(tag) + '</span>';
    }).join('');

    var receipt = expense.receiptUrl
      ? '<a class="btn btn-sm btn-secondary" href="' + esc(expense.receiptUrl) + '" target="_blank" rel="noopener">Receipt</a>'
      : '';

    return '<article class="expense-item expense-card-row" data-id="' + esc(expense._id) + '" role="listitem" tabindex="0">' +
      '<div class="expense-cat-dot" style="background:' + esc(color) + '22;color:' + esc(color) + ';" aria-hidden="true">' + esc(cat.slice(0, 2).toUpperCase()) + '</div>' +
      '<div class="expense-body">' +
      '<div class="expense-title">' + esc(expense.title) + '</div>' +
      '<div class="expense-meta">' +
      '<span>' + esc(cat) + '</span>' +
      (expense.merchant ? '<span class="expense-meta-dot"></span><span>' + esc(expense.merchant) + '</span>' : '') +
      '<span class="expense-meta-dot"></span><span>' + formatDate(expense.date) + '</span>' +
      '<span class="expense-meta-dot"></span><span>' + esc(typeLabels[type] || type) + '</span>' +
      (expense.paymentMethod ? '<span class="expense-meta-dot"></span><span>' + esc(expense.paymentMethod) + '</span>' : '') +
      tags +
      '</div>' +
      '</div>' +
      '<div class="expense-amount ' + (signed < 0 ? 'amount-credit' : '') + '">' + money(signed, expense.currency) + '</div>' +
      '<div class="expense-actions">' +
      '<button class="btn btn-sm btn-secondary view-btn" data-id="' + esc(expense._id) + '" type="button">View</button>' +
      '<button class="btn btn-sm btn-secondary edit-btn" data-id="' + esc(expense._id) + '" type="button">Edit</button>' +
      '<button class="btn btn-sm btn-danger delete-btn" data-id="' + esc(expense._id) + '" data-title="' + esc(expense.title) + '" type="button">Delete</button>' +
      receipt +
      '</div>' +
      '</article>';
  }

  function renderExpenses(expenses) {
    var container = document.getElementById('expenseList');
    if (!container) return;

    if (!expenses.length) {
      container.innerHTML = '<div class="empty-state"><p class="empty-title">No expenses found</p><p class="empty-message">Try another filter or add your first expense.</p><button class="btn btn-primary" id="emptyAddExpenseBtn" type="button">Add Expense</button></div>';
      var addBtn = document.getElementById('emptyAddExpenseBtn');
      if (addBtn) addBtn.addEventListener('click', openAddModal);
      return;
    }

    var groups = {};
    expenses.forEach(function (expense) {
      var key = monthKey(expense.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(expense);
    });

    var html = Object.keys(groups).map(function (key) {
      var total = groups[key].reduce(function (sum, expense) {
        return sum + signedAmount(expense);
      }, 0);

      return '<section class="expense-month-group">' +
        '<div class="expense-month-header"><h2>' + esc(key) + '</h2><span>' + money(total) + '</span></div>' +
        '<div class="expense-list">' + groups[key].map(renderExpenseCard).join('') + '</div>' +
        '</section>';
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('.expense-card-row').forEach(function (row) {
      function openDetail() { openDetailModal(row.dataset.id); }
      row.addEventListener('click', openDetail);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      });
    });

    container.querySelectorAll('.expense-actions').forEach(function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); });
    });

    container.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDetailModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openEditModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDeleteModal(btn.dataset.id, btn.dataset.title);
      });
    });
  }

  function renderPagination(pagination) {
    var el = document.getElementById('pagination');
    if (!el) return;

    var total = pagination.total || 0;
    var pages = pagination.pages || 1;
    renderSummary(total, pages);

    if (pages <= 1) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = '<div class="pagination">' +
      '<div class="pagination-info">Page ' + pagination.page + ' of ' + pages + ' (' + total + ' total)</div>' +
      '<div class="pagination-controls">' +
      '<button class="page-btn" id="prevPageBtn" type="button" ' + (pagination.page <= 1 ? 'disabled' : '') + '>‹</button>' +
      '<button class="page-btn" id="nextPageBtn" type="button" ' + (pagination.page >= pages ? 'disabled' : '') + '>›</button>' +
      '</div></div>';

    document.getElementById('prevPageBtn').addEventListener('click', function () {
      state.page--;
      loadExpenses();
    });
    document.getElementById('nextPageBtn').addEventListener('click', function () {
      state.page++;
      loadExpenses();
    });
  }

  function loadExpenses() {
    if (!validateDateFilters()) return;

    var seq = ++state.loadSeq;
    var loading = document.getElementById('expensesLoading');
    var error = document.getElementById('expensesError');

    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
    renderFilterState();

    expenseService.getAll(params()).then(function (res) {
      if (seq !== state.loadSeq) return;
      var data = res.data || {};
      state.currentExpenses = data.expenses || [];
      state.currentTotals = data.totals || { grossTotal: 0, netTotal: 0, taxTotal: 0, tipTotal: 0 };

      renderExpenses(state.currentExpenses);
      renderPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    }).catch(function (err) {
      if (seq !== state.loadSeq) return;
      var msgEl = document.getElementById('expensesErrorMsg');
      if (msgEl) msgEl.textContent = err.message || 'Failed to load expenses.';
      if (error) error.style.display = 'flex';
    }).finally(function () {
      if (seq === state.loadSeq && loading) loading.style.display = 'none';
    });
  }

  function loadCategories() {
    return categoryService.getAll().then(function (res) {
      state.categories = (res.data && res.data.categories) || [];

      var filterSel = document.getElementById('filterCategory');
      var modalSel = document.getElementById('expCategory');

      if (filterSel) {
        filterSel.innerHTML = '<option value="">All Categories</option>';
        state.categories.forEach(function (cat) {
          var opt = document.createElement('option');
          opt.value = cat._id;
          opt.textContent = cat.name;
          filterSel.appendChild(opt);
        });
      }

      if (modalSel) {
        modalSel.innerHTML = '<option value="">Select category</option>';
        state.categories.forEach(function (cat) {
          var opt = document.createElement('option');
          opt.value = cat._id;
          opt.textContent = cat.name;
          modalSel.appendChild(opt);
        });
      }
    }).catch(function (err) {
      showToast(err.message || 'Could not load categories.', 'error');
    });
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function clearFieldErrors() {
    ['expTitle', 'expAmount', 'expCategory', 'expDate'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('input-error');
    });
    ['expTitleError', 'expAmountError', 'expCategoryError', 'expDateError'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.style.display = 'none';
      }
    });
  }

  function showFieldError(inputId, errorId, message) {
    var input = document.getElementById(inputId);
    var err = document.getElementById(errorId);
    if (input) input.classList.add('input-error');
    if (err) {
      err.textContent = message;
      err.style.display = 'flex';
    }
  }

  function resetExpenseForm() {
    var form = document.getElementById('expenseForm');
    if (form) form.reset();

    document.getElementById('expenseId').value = '';
    document.getElementById('expDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('expCurrency').value = 'INR';
    document.getElementById('receiptPreview').innerHTML = '';
    document.getElementById('removeReceiptRow').style.display = 'none';
    document.getElementById('removeReceipt').checked = false;

    document.getElementById('expenseModalTitle').textContent = 'Add Expense';
    document.getElementById('expenseModalSubtitle').textContent = 'Keep the details useful, not complicated.';
    document.getElementById('expenseSaveBtn').textContent = 'Save Expense';

    clearFieldErrors();
  }

  function openAddModal() {
    resetExpenseForm();
    openModal('expenseModalBackdrop');
    var titleField = document.getElementById('expTitle');
    if (titleField) titleField.focus();
  }

  function fillExpenseForm(expense) {
    document.getElementById('expenseId').value = expense._id || '';
    document.getElementById('expTitle').value = expense.title || '';
    document.getElementById('expMerchant').value = expense.merchant || '';
    document.getElementById('expAmount').value = expense.amount || '';
    document.getElementById('expTransactionType').value = expense.transactionType || 'expense';
    document.getElementById('expCategory').value = expense.categoryId && expense.categoryId._id ? expense.categoryId._id : (expense.categoryId || '');
    document.getElementById('expDate').value = isoDate(expense.date);
    document.getElementById('expPayment').value = expense.paymentMethod || '';
    document.getElementById('expCurrency').value = expense.currency || 'INR';
    document.getElementById('expTax').value = expense.tax || '';
    document.getElementById('expTip').value = expense.tip || '';
    document.getElementById('expTags').value = (expense.tags || []).join(', ');
    document.getElementById('expDescription').value = expense.description || '';
    document.getElementById('expReceipt').value = '';

    var preview = document.getElementById('receiptPreview');
    preview.innerHTML = expense.receiptUrl
      ? '<a href="' + esc(expense.receiptUrl) + '" target="_blank" rel="noopener">View current receipt</a>'
      : '<span style="color:var(--text-tertiary);">No receipt attached.</span>';

    document.getElementById('removeReceiptRow').style.display = expense.receiptUrl ? 'flex' : 'none';
    document.getElementById('removeReceipt').checked = false;
  }

  function openEditModal(id) {
    expenseService.getOne(id).then(function (res) {
      var expense = res.data.expense;
      clearFieldErrors();
      fillExpenseForm(expense);

      document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
      document.getElementById('expenseModalSubtitle').textContent = 'Update this record and its receipt.';
      document.getElementById('expenseSaveBtn').textContent = 'Save Changes';

      openModal('expenseModalBackdrop');
      document.getElementById('expTitle').focus();
    }).catch(function (err) {
      showToast(err.message || 'Could not open expense.', 'error');
    });
  }

  function validateExpenseForm() {
    clearFieldErrors();
    var ok = true;

    if (!document.getElementById('expTitle').value.trim()) {
      showFieldError('expTitle', 'expTitleError', 'Title is required.');
      ok = false;
    }
    if (!document.getElementById('expAmount').value || Number(document.getElementById('expAmount').value) <= 0) {
      showFieldError('expAmount', 'expAmountError', 'Enter an amount greater than 0.');
      ok = false;
    }
    if (!document.getElementById('expCategory').value) {
      showFieldError('expCategory', 'expCategoryError', 'Category is required.');
      ok = false;
    }
    if (!document.getElementById('expDate').value) {
      showFieldError('expDate', 'expDateError', 'Date is required.');
      ok = false;
    }

    var file = document.getElementById('expReceipt').files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      showToast('Receipt must be 5MB or smaller.', 'error');
      ok = false;
    }
    return ok;
  }

  function buildFormData() {
    var fd = new FormData();
    fd.append('title', document.getElementById('expTitle').value.trim());
    fd.append('merchant', document.getElementById('expMerchant').value.trim());
    fd.append('amount', document.getElementById('expAmount').value);
    fd.append('transactionType', document.getElementById('expTransactionType').value);
    fd.append('categoryId', document.getElementById('expCategory').value);
    fd.append('date', document.getElementById('expDate').value);
    fd.append('paymentMethod', document.getElementById('expPayment').value);
    fd.append('currency', document.getElementById('expCurrency').value);
    fd.append('tax', document.getElementById('expTax').value || '0');
    fd.append('tip', document.getElementById('expTip').value || '0');
    fd.append('tags', document.getElementById('expTags').value);
    fd.append('description', document.getElementById('expDescription').value.trim());

    if (document.getElementById('removeReceipt').checked) fd.append('removeReceipt', 'true');

    var file = document.getElementById('expReceipt').files[0];
    if (file) fd.append('receipt', file);

    return fd;
  }

  function looksDuplicate() {
    var id = document.getElementById('expenseId').value;
    if (id) return false;

    var title = document.getElementById('expTitle').value.trim().toLowerCase();
    var amount = Number(document.getElementById('expAmount').value);
    var date = document.getElementById('expDate').value;

    return state.currentExpenses.some(function (expense) {
      return String(expense.title || '').trim().toLowerCase() === title &&
        Number(expense.amount || 0) === amount &&
        isoDate(expense.date) === date;
    });
  }

  function saveExpense() {
    if (!validateExpenseForm()) return;
    if (looksDuplicate() && !window.confirm('This looks like a duplicate expense. Save it anyway?')) return;

    var id = document.getElementById('expenseId').value;
    var button = document.getElementById('expenseSaveBtn');
    var label = id ? 'Save Changes' : 'Save Expense';

    setLoading(button, true, label);

    var request = id
      ? expenseService.update(id, buildFormData())
      : expenseService.create(buildFormData());

    request.then(function () {
      closeModal('expenseModalBackdrop');
      showToast(id ? 'Expense updated.' : 'Expense added.', 'success');
      loadExpenses();
    }).catch(function (err) {
      showToast(err.message || 'Failed to save expense.', 'error');
    }).finally(function () {
      setLoading(button, false, label);
    });
  }

  function openDeleteModal(id, title) {
    state.deleteTarget = id;
    document.getElementById('deleteExpenseName').textContent = title || 'this expense';
    openModal('deleteModalBackdrop');
  }

  function deleteExpense() {
    if (!state.deleteTarget) return;
    var button = document.getElementById('deleteConfirmBtn');
    setLoading(button, true, 'Delete Expense');

    expenseService.remove(state.deleteTarget).then(function () {
      closeModal('deleteModalBackdrop');
      showToast('Expense deleted.', 'success');
      state.deleteTarget = null;
      loadExpenses();
    }).catch(function (err) {
      showToast(err.message || 'Failed to delete expense.', 'error');
    }).finally(function () {
      setLoading(button, false, 'Delete Expense');
    });
  }

  function detailRow(label, value) {
    return '<div class="detail-row"><span>' + esc(label) + '</span><strong>' + (value || '-') + '</strong></div>';
  }

  function openDetailModal(id) {
    expenseService.getOne(id).then(function (res) {
      var expense = res.data.expense;
      state.detailTarget = id;

      var type = expense.transactionType || 'expense';
      var receiptHtml = expense.receiptUrl
        ? '<a href="' + esc(expense.receiptUrl) + '" target="_blank" rel="noopener">Open receipt</a>'
        : '-';

      document.getElementById('detailModalTitle').textContent = expense.title || 'Expense details';

      var bodyHTML = '<div class="detail-list">' +
        detailRow('Amount', money(signedAmount(expense), expense.currency)) +
        detailRow('Type', esc(typeLabels[type] || type)) +
        detailRow('Category', esc(categoryName(expense))) +
        detailRow('Merchant', esc(expense.merchant || '')) +
        detailRow('Date', esc(formatDate(expense.date))) +
        detailRow('Payment method', esc(expense.paymentMethod || '')) +
        detailRow('Tax', money(expense.tax || 0, expense.currency)) +
        detailRow('Tip', money(expense.tip || 0, expense.currency)) +
        detailRow('Tags', esc((expense.tags || []).join(', '))) +
        detailRow('Receipt', receiptHtml) +
        '</div>';

      if (expense.description) {
        bodyHTML += '<div class="detail-note"><span>Notes</span><p>' + esc(expense.description) + '</p></div>';
      }

      document.getElementById('detailModalBody').innerHTML = bodyHTML;
      openModal('detailModalBackdrop');
    }).catch(function (err) {
      showToast(err.message || 'Could not open details.', 'error');
    });
  }

  function exportCsv() {
    if (!state.currentExpenses.length) {
      showToast('No expenses to export for the current filter.', 'warning');
      return;
    }

    var rows = [[
      'Date', 'Title', 'Merchant', 'Category', 'Type', 'Amount', 'Signed Amount', 'Currency',
      'Payment Method', 'Tax', 'Tip', 'Tags', 'Description', 'Receipt URL'
    ]];

    state.currentExpenses.forEach(function (expense) {
      rows.push([
        isoDate(expense.date),
        expense.title || '',
        expense.merchant || '',
        categoryName(expense),
        expense.transactionType || 'expense',
        expense.amount || 0,
        signedAmount(expense),
        expense.currency || 'INR',
        expense.paymentMethod || '',
        expense.tax || 0,
        expense.tip || 0,
        (expense.tags || []).join('|'),
        expense.description || '',
        expense.receiptUrl || ''
      ]);
    });

    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'expenses-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function bindUi() {
    var root = document.documentElement;
    var savedTheme = localStorage.getItem('es-theme') || 'light';
    var sun = document.getElementById('themeIconSun');
    var moon = document.getElementById('themeIconMoon');

    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('es-theme', theme);
      if (sun) sun.style.display = theme === 'dark' ? 'none' : '';
      if (moon) moon.style.display = theme === 'dark' ? '' : 'none';
    }
    applyTheme(savedTheme);

    document.getElementById('themeToggle')?.addEventListener('click', function () {
      var current = root.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', auth.logout);
    document.getElementById('mobileNavBtn')?.addEventListener('click', function () {
      var sidebar = document.getElementById('sidebar');
      var open = sidebar.classList.toggle('open');
      this.setAttribute('aria-expanded', String(open));
    });

    document.getElementById('addExpenseBtn')?.addEventListener('click', openAddModal);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsv);

    document.getElementById('filterToggleBtn').addEventListener('click', function () {
      state.filtersExpanded = !state.filtersExpanded;
      renderFilterState();
    });

    document.getElementById('expenseSaveBtn').addEventListener('click', saveExpense);
    document.getElementById('expenseModalClose').addEventListener('click', function () { closeModal('expenseModalBackdrop'); });
    document.getElementById('expenseCancelBtn').addEventListener('click', function () { closeModal('expenseModalBackdrop'); });

    document.getElementById('deleteConfirmBtn').addEventListener('click', deleteExpense);
    document.getElementById('deleteModalClose').addEventListener('click', function () { closeModal('deleteModalBackdrop'); });
    document.getElementById('deleteCancelBtn').addEventListener('click', function () { closeModal('deleteModalBackdrop'); });

    document.getElementById('detailModalClose').addEventListener('click', function () { closeModal('detailModalBackdrop'); });
    document.getElementById('detailCloseBtn').addEventListener('click', function () { closeModal('detailModalBackdrop'); });
    document.getElementById('detailEditBtn').addEventListener('click', function () {
      closeModal('detailModalBackdrop');
      if (state.detailTarget) openEditModal(state.detailTarget);
    });

    ['expenseModalBackdrop', 'deleteModalBackdrop', 'detailModalBackdrop'].forEach(function (id) {
      document.getElementById(id).addEventListener('click', function (event) {
        if (event.target === this) closeModal(id);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeModal('expenseModalBackdrop');
        closeModal('deleteModalBackdrop');
        closeModal('detailModalBackdrop');
      }
    });

    document.getElementById('expReceipt').addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      document.getElementById('receiptPreview').innerHTML = '<span>Selected: ' + esc(file.name) + '</span>';
    });

    document.getElementById('searchInput').addEventListener('input', debounce(function (event) {
      state.search = event.target.value.trim();
      state.page = 1;
      loadExpenses();
    }, 350));

    document.getElementById('filterCategory').addEventListener('change', function () {
      state.category = this.value;
      state.page = 1;
      loadExpenses();
    });

    document.getElementById('filterTransactionType').addEventListener('change', function () {
      state.transactionType = this.value;
      state.filtersExpanded = true;
      state.page = 1;
      loadExpenses();
    });

    document.getElementById('filterDateFrom').addEventListener('change', function () {
      state.dateFrom = this.value;
      state.filtersExpanded = true;
      state.page = 1;
      loadExpenses();
    });

    document.getElementById('filterDateTo').addEventListener('change', function () {
      state.dateTo = this.value;
      state.filtersExpanded = true;
      state.page = 1;
      loadExpenses();
    });

    document.getElementById('sortBy').addEventListener('change', function () {
      state.sortBy = this.value;
      state.filtersExpanded = true;
      state.page = 1;
      loadExpenses();
    });

    document.getElementById('sortOrderBtn').addEventListener('click', function () {
      state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc';
      this.textContent = state.sortOrder === 'desc' ? 'Newest first' : 'Oldest first';
      state.filtersExpanded = true;
      state.page = 1;
      loadExpenses();
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', function () {
      state.search = '';
      state.category = '';
      state.transactionType = '';
      state.dateFrom = '';
      state.dateTo = '';
      state.sortBy = 'date';
      state.sortOrder = 'desc';
      state.filtersExpanded = false;
      state.page = 1;

      document.getElementById('searchInput').value = '';
      document.getElementById('filterCategory').value = '';
      document.getElementById('filterTransactionType').value = '';
      document.getElementById('filterDateFrom').value = '';
      document.getElementById('filterDateTo').value = '';
      document.getElementById('sortBy').value = 'date';
      document.getElementById('sortOrderBtn').textContent = 'Newest first';
      document.getElementById('filterError').style.display = 'none';

      loadExpenses();
    });

    renderFilterState();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var user = await auth.requireAuth();
    if (!user) return;

    bindUi();
    await loadCategories();
    loadExpenses();
  });
})();