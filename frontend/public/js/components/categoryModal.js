var categoryModal = (function () {
  var editingId = null;

  var ICON_OPTIONS = [
    { value: 'food',          label: 'Food' },
    { value: 'transport',     label: 'Transport' },
    { value: 'shopping',      label: 'Shopping' },
    { value: 'bills',         label: 'Bills' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'health',        label: 'Health' },
    { value: 'travel',        label: 'Travel' },
    { value: 'education',     label: 'Education' },
    { value: 'other',         label: 'Other' },
  ];

  function buildModal() {
    var existing = document.getElementById('categoryModal');
    if (existing) existing.remove();

    var iconHtml = ICON_OPTIONS.map(function (o) {
      return '<span class="icon-option" data-icon="' + o.value
        + '" onclick="categoryModal.selectIcon(\'' + o.value + '\')">'
        + o.label + '</span>';
    }).join('');

    var el = document.createElement('div');
    el.id        = 'categoryModal';
    el.className = 'modal-overlay hidden';
    el.innerHTML =
      '<div class="modal-box">'
      + '<div class="modal-header">'
      + '<h3 id="categoryModalTitle">New Category</h3>'
      + '<button class="modal-close" onclick="categoryModal.close()">Close</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<div class="form-group"><label>Name <span class="required">*</span></label>'
      + '<input id="catName" type="text" placeholder="Category name" maxlength="50" /></div>'
      + '<div class="form-group"><label>Color</label>'
      + '<input id="catColor" type="color" value="#0f766e" /></div>'
      + '<div class="form-group"><label>Type</label>'
      + '<div class="icon-picker" id="iconPicker">' + iconHtml + '</div>'
      + '<input id="catIcon" type="hidden" value="other" /></div>'
      + '</div>'
      + '<div class="modal-footer">'
      + '<button class="btn btn-secondary" onclick="categoryModal.close()">Cancel</button>'
      + '<button class="btn btn-primary" onclick="categoryModal.save()">Save</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
  }

  function open(category) {
    category = category || null;
    buildModal();
    editingId = (category && category._id) ? category._id : null;
    document.getElementById('categoryModalTitle').textContent = editingId ? 'Edit Category' : 'New Category';
    document.getElementById('catName').value  = (category && category.name)  ? category.name  : '';
    document.getElementById('catColor').value = (category && category.color) ? category.color : '#0f766e';
    var selectedIcon = (category && category.icon) ? category.icon : 'other';
    document.getElementById('catIcon').value = selectedIcon;
    document.querySelectorAll('.icon-option').forEach(function (el) {
      el.classList.toggle('selected', el.dataset.icon === selectedIcon);
    });
    document.getElementById('categoryModal').classList.remove('hidden');
  }

  function close() {
    var el = document.getElementById('categoryModal');
    if (el) el.classList.add('hidden');
  }

  function selectIcon(icon) {
    document.getElementById('catIcon').value = icon;
    document.querySelectorAll('.icon-option').forEach(function (el) {
      el.classList.toggle('selected', el.dataset.icon === icon);
    });
  }

  function save() {
    var name = document.getElementById('catName').value.trim();
    if (!name) { alert('Please enter a category name'); return; }
    var payload = {
      name:  name,
      color: document.getElementById('catColor').value,
      icon:  document.getElementById('catIcon').value,
    };
    var promise = editingId
      ? categoryService.update(editingId, payload)
      : categoryService.create(payload);
    promise
      .then(function () {
        close();
        if (typeof loadCategories === 'function')        loadCategories();
        if (typeof refreshCategoryDropdown === 'function') refreshCategoryDropdown();
      })
      .catch(function (err) { alert(err.message); });
  }

  return { open: open, close: close, save: save, selectIcon: selectIcon };
})();
