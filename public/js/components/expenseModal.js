// var expenseModal = (function () {
//   var editingId = null;

//   function buildModal(categories) {
//     categories = categories || [];
//     var existing = document.getElementById('expenseModal');
//     if (existing) existing.remove();

//     var catOptions = categories.map(function (c) {
//       return '<option value="' + c._id + '">' + c.name + '</option>';
//     }).join('');

//     var el = document.createElement('div');
//     el.id        = 'expenseModal';
//     el.className = 'modal-overlay hidden';
//     el.innerHTML =
//       '<div class="modal-box modal-lg">'
//       + '<div class="modal-header">'
//       + '<h3 id="expenseModalTitle">New Expense</h3>'
//       + '<button class="modal-close" onclick="expenseModal.close()">Close</button>'
//       + '</div>'
//       + '<div class="modal-body">'
//       + '<div class="form-row">'
//       + '<div class="form-group flex-2"><label>Title <span class="required">*</span></label>'
//       + '<input id="expTitle" type="text" placeholder="e.g. Lunch at cafe" minlength="2" maxlength="150" /></div>'
//       + '<div class="form-group flex-1"><label>Amount <span class="required">*</span></label>'
//       + '<input id="expAmount" type="number" min="0.01" step="0.01" placeholder="0.00" /></div>'
//       + '</div>'
//       + '<div class="form-row">'
//       + '<div class="form-group flex-1"><label>Date <span class="required">*</span></label>'
//       + '<input id="expDate" type="date" /></div>'
//       + '<div class="form-group flex-1"><label>Category <span class="required">*</span></label>'
//       + '<select id="expCategory"><option value="">Select category</option>' + catOptions + '</select></div>'
//       + '</div>'
//       + '<div class="form-row">'
//       + '<div class="form-group flex-1"><label>Payment Method</label>'
//       + '<select id="expPayment"><option value="">Select</option>'
//       + '<option value="cash">Cash</option><option value="card">Card</option>'
//       + '<option value="upi">UPI</option><option value="netbanking">Net Banking</option>'
//       + '<option value="other">Other</option></select></div>'
//       + '<div class="form-group flex-1"><label>Tags</label>'
//       + '<input id="expTags" type="text" placeholder="comma separated" /></div>'
//       + '</div>'
//       + '<div class="form-group"><label>Description</label>'
//       + '<textarea id="expDescription" rows="2" placeholder="Optional notes" maxlength="500"></textarea></div>'
//       + '<div class="form-group"><label>Receipt</label>'
//       + '<input id="expReceipt" type="file" accept="image/*,.pdf" />'
//       + '<div id="expReceiptPreview" class="receipt-preview"></div></div>'
//       + '</div>'
//       + '<div class="modal-footer">'
//       + '<button class="btn btn-secondary" onclick="expenseModal.close()">Cancel</button>'
//       + '<button class="btn btn-primary" onclick="expenseModal.save()">Save Expense</button>'
//       + '</div>'
//       + '</div>';
//     document.body.appendChild(el);
//   }

//   function open(expense) {
//     expense = expense || null;
//     categoryService.getAll()
//       .then(function (res) { return res.data.categories; })
//       .catch(function () { return []; })
//       .then(function (categories) {
//         buildModal(categories);
//         editingId = (expense && expense._id) ? expense._id : null;
//         document.getElementById('expenseModalTitle').textContent = editingId ? 'Edit Expense' : 'New Expense';

//         if (expense) {
//           document.getElementById('expTitle').value       = expense.title       || '';
//           document.getElementById('expAmount').value      = expense.amount      || '';
//           document.getElementById('expDate').value        = expense.date        ? expense.date.substring(0, 10) : '';
//           document.getElementById('expCategory').value   = (expense.categoryId && expense.categoryId._id)
//             ? expense.categoryId._id : (expense.categoryId || '');
//           document.getElementById('expPayment').value     = expense.paymentMethod || '';
//           document.getElementById('expTags').value        = (expense.tags || []).join(', ');
//           document.getElementById('expDescription').value = expense.description  || '';
//           if (expense.receiptUrl) {
//             document.getElementById('expReceiptPreview').innerHTML =
//               '<a href="' + expense.receiptUrl + '" target="_blank" class="receipt-link">View current receipt</a>';
//           }
//         } else {
//           document.getElementById('expDate').value = new Date().toISOString().substring(0, 10);
//         }

//         document.getElementById('expenseModal').classList.remove('hidden');
//       });
//   }

//   function close() {
//     var el = document.getElementById('expenseModal');
//     if (el) el.classList.add('hidden');
//   }

//   function save() {
//     var title      = document.getElementById('expTitle').value.trim();
//     var amount     = document.getElementById('expAmount').value;
//     var date       = document.getElementById('expDate').value;
//     var categoryId = document.getElementById('expCategory').value;

//     if (!title || title.length < 2)          { alert('Title must be at least 2 characters'); return; }
//     if (!amount || parseFloat(amount) <= 0)  { alert('Amount must be greater than 0');       return; }
//     if (!date)                               { alert('Date is required');                     return; }
//     if (!categoryId)                         { alert('Please select a category');             return; }

//     var fd = new FormData();
//     fd.append('title',         title);
//     fd.append('amount',        amount);
//     fd.append('date',          date);
//     fd.append('categoryId',    categoryId);
//     fd.append('paymentMethod', document.getElementById('expPayment').value);
//     fd.append('tags',          document.getElementById('expTags').value);
//     fd.append('description',   document.getElementById('expDescription').value);
//     var files = document.getElementById('expReceipt').files;
//     if (files.length > 0) fd.append('receipt', files[0]);

//     var promise = editingId
//       ? expenseService.update(editingId, fd)
//       : expenseService.create(fd);

//     promise
//       .then(function () {
//         close();
//         if (typeof loadExpenses          === 'function') loadExpenses();
//         if (typeof loadDashboardExpenses === 'function') loadDashboardExpenses();
//       })
//       .catch(function (err) { alert(err.message); });
//   }

//   return { open: open, close: close, save: save };
// })();
