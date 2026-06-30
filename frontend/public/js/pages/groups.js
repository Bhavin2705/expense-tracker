(function () {
  'use strict';

  var state = {
    groups: [],
    selectedId: null,
    selectedGroup: null,
    participants: [],
    splitExpenses: [],
    balances: [],
    currentUser: null,
    search: "",
    archived: "",
    searchTimer: null,
    detailTab: "participants",
    loadSeq: 0
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmt(amount, currency) {
    return new Intl.NumberFormat('en-IN', {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2
    }).format(Number(amount) || 0);
  }

  function fmtDate(d) {
    if (!d) return "";
    var date = new Date(d);
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString('en-IN', { day: "numeric", month: "short", year: "numeric" });
  }

  function notify(message, type) {
    var container = document.getElementById("toast-container");
    if (!container) return;
    var item = document.createElement("div");
    item.className = "toast toast-" + (type || "info");
    item.textContent = message;
    container.appendChild(item);
    setTimeout(function () { item.remove(); }, 3000);
  }

  function setButtonLoading(button, loading, label) {
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : label;
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.add("hidden"); document.body.style.overflow = ""; }
  }

  function isAdmin(group) {
    if (!group || !state.currentUser) return false;
    return getId(group.createdBy) === getId(state.currentUser);
  }

  function getId(value) {
    if (!value) return "";
    if (typeof value === "object") return String(value._id || value.id || "");
    return String(value);
  }

  // FIX: API responses are returned directly by the service (already parsed JSON).
  // The server may wrap in { data: ... } or return the resource at the top level.
  // This helper safely unwraps either shape.
  function getResponseData(response) {
    if (!response) return {};
    // If the server wraps in a "data" envelope, unwrap it; otherwise use response as-is.
    return response.data !== undefined ? response.data : response;
  }

  function renderStats() {
    var active = state.groups.filter(function (g) { return !g.isArchived; }).length;
    var participants = state.groups.reduce(function (sum, g) {
      return sum + Number(g.participantCount || 0);
    }, 0);

    document.getElementById("groupStats").innerHTML =
      '<div class="stat-card"><div class="stat-label">Groups shown</div><div class="stat-value">' + state.groups.length + '</div><div class="stat-delta">Current filter</div></div>' +
      '<div class="stat-card"><div class="stat-label">Active groups</div><div class="stat-value">' + active + '</div><div class="stat-delta">Open for collaboration</div></div>' +
      '<div class="stat-card"><div class="stat-label">Participants</div><div class="stat-value">' + participants + '</div><div class="stat-delta">Across shown groups</div></div>';
  }

  function groupCard(group) {
    var selected = group._id === state.selectedId ? " selected" : "";
    var userIsAdmin = isAdmin(group);

    return '<article class="group-card' + selected + '" data-group-id="' + esc(group._id) + '" tabindex="0" role="listitem">' +
      '<div class="group-card-top">' +
      '<div class="group-icon">' +
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
      '</div>' +
      '<span class="badge ' + (group.isArchived ? "badge-default" : "badge-success") + '">' +
      (group.isArchived ? "Archived" : "Active") +
      '</span>' +
      (userIsAdmin ? '<span class="badge badge-brand">Admin</span>' : '') +
      '</div>' +
      '<h2>' + esc(group.name) + '</h2>' +
      '<p class="group-card-description">' + esc(group.description || "No description added.") + '</p>' +
      '<div class="group-card-meta">' +
      '<span>' + Number(group.participantCount || 0) + ' participant' + (Number(group.participantCount || 0) === 1 ? "" : "s") + '</span>' +
      '<strong>' + esc(group.currency || "INR") + '</strong>' +
      '</div>' +
      '</article>';
  }

  function renderGroups() {
    var container = document.getElementById("groupsContainer");
    if (!state.groups.length) {
      container.innerHTML = '<div class="groups-empty"><strong>No groups found</strong><p>Try another filter or create your first group.</p></div>';
      renderDetail();
      return;
    }
    container.innerHTML = state.groups.map(groupCard).join("");

    container.querySelectorAll(".group-card").forEach(function (card) {
      function select() { selectGroup(card.dataset.groupId); }
      card.addEventListener("click", select);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
      });
    });
  }

  function tabBar() {
    var tabs = [
      { id: "participants", label: "Participants" },
      { id: "expenses", label: "Expenses" },
      { id: "balances", label: "Balances" }
    ];
    return '<div class="detail-tabs" role="tablist">' +
      tabs.map(function (t) {
        return '<button role="tab" class="detail-tab' + (state.detailTab === t.id ? " active" : "") +
          '" data-tab="' + t.id + '" aria-selected="' + (state.detailTab === t.id) + '">' + t.label + '</button>';
      }).join("") +
      '</div>';
  }

  function participantRow(participant) {
    var name = participant.name || "Participant";
    var initials = name.split(/\s+/).map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase();
    return '<div class="participant-item">' +
      '<div class="participant-avatar">' + esc(initials || "P") + '</div>' +
      '<div class="participant-info">' +
      '<div class="participant-name">' + esc(name) +
      (participant.linkedUserId ? ' <span class="badge badge-success">Linked</span>' : "") +
      (!participant.isActive ? ' <span class="badge badge-default">Inactive</span>' : "") +
      '</div>' +
      '<div class="participant-email">' + esc(participant.email || participant.notes || "No email added") + '</div>' +
      '</div>' +
      '<div class="participant-actions">' +
      '<button class="btn btn-sm btn-ghost participant-edit" data-id="' + esc(participant._id) + '">Edit</button>' +
      (!participant.linkedUserId ? '<button class="btn btn-sm btn-ghost participant-link" data-id="' + esc(participant._id) + '">Link</button>' : "") +
      '<button class="btn btn-sm btn-ghost participant-delete" data-id="' + esc(participant._id) + '">Remove</button>' +
      '</div></div>';
  }

  function expenseRow(expense) {
    var currency = (state.selectedGroup && state.selectedGroup.currency) || "INR";
    var settled = expense.splits && expense.splits.length > 0 && expense.splits.every(function (s) { return s.settled; });
    var paidByName = expense.paidBy && expense.paidBy.name ? expense.paidBy.name : "Unknown";
    return '<div class="participant-item expense-row" data-expense-id="' + esc(expense._id) + '" style="cursor:pointer">' +
      '<div class="participant-avatar" style="background:var(--color-brand-muted,#e8f0fe);color:var(--color-brand)">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' +
      '</div>' +
      '<div class="participant-info">' +
      '<div class="participant-name">' + esc(expense.title) +
      (settled ? ' <span class="badge badge-success">Settled</span>' : '') +
      (expense.category ? ' <span class="badge badge-default">' + esc(expense.category) + '</span>' : '') +
      '</div>' +
      '<div class="participant-email">Paid by ' + esc(paidByName) + ' &bull; ' + fmtDate(expense.date) + '</div>' +
      '</div>' +
      '<div class="participant-actions">' +
      '<strong style="font-size:13px;white-space:nowrap">' + fmt(expense.amount, currency) + '</strong>' +
      '</div></div>';
  }

  function balanceRow(balance) {
    var currency = (state.selectedGroup && state.selectedGroup.currency) || "INR";
    var net = balance.net;
    var color = net > 0 ? "var(--color-success)" : net < 0 ? "var(--color-danger)" : "var(--text-secondary)";
    var label = net > 0 ? "is owed " + fmt(net, currency) : net < 0 ? "owes " + fmt(Math.abs(net), currency) : "settled up";
    return '<div class="participant-item">' +
      '<div class="participant-avatar">' + esc((balance.name || "?").charAt(0).toUpperCase()) + '</div>' +
      '<div class="participant-info">' +
      '<div class="participant-name">' + esc(balance.name) + '</div>' +
      '<div class="participant-email">Paid ' + fmt(balance.paid, currency) + ' &bull; Owes ' + fmt(balance.owes, currency) + '</div>' +
      '</div>' +
      '<div class="participant-actions">' +
      '<span style="font-size:13px;font-weight:600;color:' + color + '">' + label + '</span>' +
      '</div></div>';
  }

  function renderDetailParticipants(panel) {
    panel.querySelector("#detailTabContent").innerHTML =
      '<div class="participants-panel">' +
      '<div class="participant-heading">' +
      '<div><h3 class="section-title">Participants</h3>' +
      '<p style="font-size:12px;color:var(--text-secondary);margin-top:2px">People included in this group</p></div>' +
      '<button class="btn btn-sm btn-primary" id="addParticipantBtn">Add person</button>' +
      '</div>' +
      '<div class="participant-list">' +
      (state.participants.length ? state.participants.map(participantRow).join("") : '<div class="empty-state" style="padding:var(--space-6)"><p class="empty-title">No participants yet</p><p class="empty-message">Add the people sharing expenses in this group.</p></div>') +
      '</div></div>';

    panel.querySelector("#addParticipantBtn").onclick = function () { showParticipantModal(); };
    panel.querySelectorAll(".participant-edit").forEach(function (btn) {
      btn.onclick = function () {
        var p = state.participants.find(function (x) { return x._id === btn.dataset.id; });
        showParticipantModal(p);
      };
    });
    panel.querySelectorAll(".participant-link").forEach(function (btn) {
      btn.onclick = function () { showLinkModal(btn.dataset.id); };
    });
    panel.querySelectorAll(".participant-delete").forEach(function (btn) {
      btn.onclick = function () { removeParticipant(btn.dataset.id); };
    });
  }

  function renderDetailExpenses(panel) {
    panel.querySelector("#detailTabContent").innerHTML =
      '<div class="participants-panel">' +
      '<div class="participant-heading">' +
      '<div><h3 class="section-title">Expenses</h3>' +
      '<p style="font-size:12px;color:var(--text-secondary);margin-top:2px">Costs recorded in this group</p></div>' +
      '<button class="btn btn-sm btn-primary" id="addExpenseBtn">Add expense</button>' +
      '</div>' +
      '<div class="participant-list" id="expenseList">' +
      (state.splitExpenses.length ? state.splitExpenses.map(expenseRow).join("") : '<div class="empty-state" style="padding:var(--space-6)"><p class="empty-title">No expenses yet</p><p class="empty-message">Record the first shared cost for this group.</p></div>') +
      '</div></div>';

    panel.querySelector("#addExpenseBtn").onclick = function () { showSplitModal(); };
    panel.querySelectorAll(".expense-row").forEach(function (row) {
      row.onclick = function () {
        var expense = state.splitExpenses.find(function (e) { return e._id === row.dataset.expenseId; });
        if (expense) showExpenseDetail(expense);
      };
    });
  }

  function renderDetailBalances(panel) {
    panel.querySelector("#detailTabContent").innerHTML =
      '<div class="participants-panel">' +
      '<div class="participant-heading">' +
      '<div><h3 class="section-title">Balances</h3>' +
      '<p style="font-size:12px;color:var(--text-secondary);margin-top:2px">Who owes what</p></div>' +
      '<button class="btn btn-sm btn-ghost" id="refreshBalancesBtn">Refresh</button>' +
      '</div>' +
      '<div class="participant-list">' +
      (state.balances.length ? state.balances.map(balanceRow).join("") : '<div class="empty-state" style="padding:var(--space-6)"><p class="empty-title">No balances yet</p><p class="empty-message">Balances appear once expenses are added.</p></div>') +
      '</div></div>';

    panel.querySelector("#refreshBalancesBtn").onclick = function () { loadBalances(); };
  }

  function renderDetail() {
    var panel = document.getElementById("groupDetail");
    if (!state.selectedGroup) {
      panel.innerHTML = '<div class="group-detail-empty"><div><strong>Select a group</strong><p>Its participants and controls will appear here.</p></div></div>';
      return;
    }

    var group = state.selectedGroup;
    var userIsAdmin = isAdmin(group);

    var actionsHTML = userIsAdmin
      ? '<div class="detail-actions">' +
      '<button class="btn btn-sm btn-secondary" id="editSelectedGroup">Edit</button>' +
      '<button class="btn btn-sm btn-secondary" id="archiveSelectedGroup">' + (group.isArchived ? "Unarchive" : "Archive") + '</button>' +
      '<button class="btn btn-sm btn-danger" id="deleteSelectedGroup">Delete</button>' +
      '</div>'
      : '<div class="detail-actions"><span class="text-muted">Member access</span></div>';

    panel.innerHTML =
      '<div class="detail-heading">' +
      '<div class="detail-heading-row">' +
      '<div>' +
      '<h2>' + esc(group.name) + '</h2>' +
      '<p class="detail-description">' + esc(group.description || "No description added.") + '</p>' +
      '</div>' +
      '<span class="badge ' + (group.isArchived ? "badge-default" : "badge-success") + '">' +
      (group.isArchived ? "Archived" : "Active") + '</span>' +
      '</div>' +
      '<div class="detail-meta">' +
      '<span class="badge badge-default">' + esc(group.currency || "INR") + '</span>' +
      '<span class="badge badge-default">' + state.participants.length + ' participants</span>' +
      '</div>' +
      actionsHTML +
      '</div>' +
      tabBar() +
      '<div id="detailTabContent"></div>';

    if (userIsAdmin) {
      panel.querySelector("#editSelectedGroup").onclick = function () { showGroupModal(group); };
      panel.querySelector("#archiveSelectedGroup").onclick = archiveSelectedGroup;
      panel.querySelector("#deleteSelectedGroup").onclick = deleteSelectedGroup;
    }

    panel.querySelectorAll(".detail-tab").forEach(function (tab) {
      tab.onclick = function () {
        state.detailTab = tab.dataset.tab;
        renderDetail();
      };
    });

    if (state.detailTab === "participants") renderDetailParticipants(panel);
    else if (state.detailTab === "expenses") renderDetailExpenses(panel);
    else renderDetailBalances(panel);
  }

  async function loadGroups(preserveSelection) {
    var seq = ++state.loadSeq;
    document.getElementById("groupsLoading").style.display = "flex";
    document.getElementById("groupsError").style.display = "none";
    document.getElementById("groupsLayout").style.display = "none";

    try {
      var response = await groupService.getGroups({ search: state.search, archived: state.archived });
      // FIX: unwrap response — server may return array directly, or { data: [...] }, or { groups: [...] }
      var payload = getResponseData(response);
      state.groups = Array.isArray(payload) ? payload : (payload.groups || Array.isArray(response) ? (payload.groups || response) : []);
      // Belt-and-suspenders: ensure it's always an array
      if (!Array.isArray(state.groups)) state.groups = [];

      if (!preserveSelection || !state.groups.some(function (g) { return g._id === state.selectedId; })) {
        state.selectedId = state.groups.length ? state.groups[0]._id : null;
      }

      renderStats();
      renderGroups();

      if (state.selectedId) {
        await selectGroup(state.selectedId, false);
      } else {
        state.selectedGroup = null;
        state.participants = [];
        state.splitExpenses = [];
        state.balances = [];
        renderDetail();
      }

      document.getElementById("groupsLayout").style.display = "grid";
    } catch (error) {
      var box = document.getElementById("groupsError");
      box.textContent = error.message || "Failed to load groups";
      box.style.display = "flex";
      // Still show the layout so the page isn't blank
      document.getElementById("groupsLayout").style.display = "grid";
    } finally {
      if (seq === state.loadSeq) document.getElementById("groupsLoading").style.display = "none";
    }
  }

  async function selectGroup(id, rerenderCards) {
    state.selectedId = id;
    if (rerenderCards !== false) renderGroups();

    var panel = document.getElementById("groupDetail");
    panel.innerHTML = '<div class="group-detail-empty"><div class="spinner"></div></div>';

    try {
      var response = await groupService.getGroup(id);
      // FIX: server may return { group, participants } or { data: { group, participants } }
      var data = getResponseData(response);
      state.selectedGroup = data.group || data;
      state.participants = data.participants || [];
      state.splitExpenses = [];
      state.balances = [];

      // Load expenses and balances; don't let either failure block rendering
      await Promise.all([loadExpenses(), loadBalances()]);
      renderDetail();
    } catch (error) {
      panel.innerHTML = '<div class="group-detail-empty"><p>' + esc(error.message || "Failed to load group") + '</p></div>';
    }
  }

  async function loadExpenses() {
    if (!state.selectedId) return;
    // FIX: guard against splitService not being defined
    if (typeof splitService === "undefined") { state.splitExpenses = []; return; }
    try {
      var response = await splitService.getExpenses(state.selectedId);
      var data = getResponseData(response);
      state.splitExpenses = data.expenses || (Array.isArray(data) ? data : (Array.isArray(response) ? response : []));
    } catch (e) {
      state.splitExpenses = [];
    }
  }

  async function loadBalances() {
    if (!state.selectedId) return;
    // FIX: guard against splitService not being defined
    if (typeof splitService === "undefined") { state.balances = []; return; }
    try {
      var response = await splitService.getBalances(state.selectedId);
      var data = getResponseData(response);
      state.balances = Array.isArray(data) ? data : (Array.isArray(response) ? response : []);
    } catch (e) {
      state.balances = [];
    }
  }

  function showGroupModal(group) {
    var form = document.getElementById("groupForm");
    form.reset();
    document.getElementById("groupId").value = group ? group._id : "";
    document.getElementById("groupModalTitle").textContent = group ? "Edit group" : "Create group";
    document.getElementById("groupModalSubtitle").textContent = group ? "Update this shared space" : "Set up a shared expense space";
    document.getElementById("groupSaveBtn").textContent = group ? "Save changes" : "Create group";
    if (group) {
      document.getElementById("groupName").value = group.name || "";
      document.getElementById("groupDescription").value = group.description || "";
      document.getElementById("groupCurrency").value = group.currency || "INR";
    }
    openModal("groupModalBackdrop");
    // FIX: defer focus to after modal is visible (helps in some browsers)
    setTimeout(function () {
      var nameField = document.getElementById("groupName");
      if (nameField) nameField.focus();
    }, 50);
  }

  async function saveGroup(event) {
    if (event) event.preventDefault();

    var form = document.getElementById("groupForm");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var id = document.getElementById("groupId").value.trim();
    var payload = {
      name: document.getElementById("groupName").value.trim(),
      description: document.getElementById("groupDescription").value.trim(),
      currency: document.getElementById("groupCurrency").value
    };

    // Extra guard: name must not be empty (belt-and-suspenders beyond HTML validation)
    if (!payload.name) {
      notify("Group name is required", "error");
      return;
    }

    var button = document.getElementById("groupSaveBtn");
    var label = id ? "Save changes" : "Create group";
    setButtonLoading(button, true, label);

    try {
      var response = id
        ? await groupService.updateGroup(id, payload)
        : await groupService.createGroup(payload);

      // FIX: correctly extract the new group's _id regardless of response shape
      // Server may return: { _id } | { group: { _id } } | { data: { _id } } | { data: { group: { _id } } }
      var raw = response || {};
      var inner = raw.data !== undefined ? raw.data : raw;
      var newId = inner._id || (inner.group && inner.group._id) || id || state.selectedId;
      if (newId) state.selectedId = newId;

      closeModal("groupModalBackdrop");
      notify(id ? "Group updated" : "Group created successfully! You are now the admin.", "success");
      await loadGroups(true);
    } catch (error) {
      notify(error.message || "Failed to save group", "error");
    } finally {
      setButtonLoading(button, false, label);
    }
  }

  function showParticipantModal(participant) {
    document.getElementById("participantForm").reset();
    document.getElementById("participantId").value = participant ? participant._id : "";
    document.getElementById("participantModalTitle").textContent = participant ? "Edit participant" : "Add participant";
    document.getElementById("participantSaveBtn").textContent = participant ? "Save changes" : "Add participant";
    document.getElementById("participantActiveRow").style.display = participant ? "flex" : "none";
    if (participant) {
      document.getElementById("participantName").value = participant.name || "";
      document.getElementById("participantEmail").value = participant.email || "";
      document.getElementById("participantNotes").value = participant.notes || "";
      document.getElementById("participantActive").checked = participant.isActive !== false;
    }
    openModal("participantModalBackdrop");
    setTimeout(function () {
      var nameField = document.getElementById("participantName");
      if (nameField) nameField.focus();
    }, 50);
  }

  async function saveParticipant(event) {
    if (event) event.preventDefault();
    var form = document.getElementById("participantForm");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var id = document.getElementById("participantId").value.trim();
    var payload = {
      name: document.getElementById("participantName").value.trim(),
      email: document.getElementById("participantEmail").value.trim(),
      notes: document.getElementById("participantNotes").value.trim()
    };
    if (id) payload.isActive = document.getElementById("participantActive").checked;

    var button = document.getElementById("participantSaveBtn");
    var label = id ? "Save changes" : "Add participant";
    setButtonLoading(button, true, label);

    try {
      if (id) {
        await groupService.updateParticipant(id, payload);
      } else {
        await groupService.createParticipant(state.selectedId, payload);
      }
      closeModal("participantModalBackdrop");
      notify(id ? "Participant updated" : "Participant added", "success");
      await loadGroups(true);
    } catch (error) {
      notify(error.message || "Failed to save participant", "error");
    } finally {
      setButtonLoading(button, false, label);
    }
  }

  function showLinkModal(id) {
    document.getElementById("linkForm").reset();
    document.getElementById("linkParticipantId").value = id;
    var participant = state.participants.find(function (p) { return p._id === id; });
    document.getElementById("linkEmail").value = (participant && participant.email) ? participant.email : "";
    openModal("linkModalBackdrop");
    setTimeout(function () {
      var emailField = document.getElementById("linkEmail");
      if (emailField) emailField.focus();
    }, 50);
  }

  async function linkParticipant(event) {
    if (event) event.preventDefault();
    var button = document.getElementById("linkSaveBtn");
    setButtonLoading(button, true, "Link account");
    try {
      await groupService.linkParticipant(document.getElementById("linkParticipantId").value, {
        email: document.getElementById("linkEmail").value.trim()
      });
      closeModal("linkModalBackdrop");
      notify("Account linked to participant", "success");
      await selectGroup(state.selectedId);
    } catch (error) {
      notify(error.message || "Failed to link account", "error");
    } finally {
      setButtonLoading(button, false, "Link account");
    }
  }

  function buildSplitParticipantRows(splitType) {
    var container = document.getElementById("splitParticipantRows");
    container.innerHTML = "";
    if (!state.participants.length) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-secondary)">No participants in this group yet. Add participants first.</p>';
      return;
    }
    state.participants.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "participant-item";
      row.style.padding = "var(--space-2) 0";

      var checkId = "split-check-" + p._id;
      var amountId = "split-amount-" + p._id;
      var pctId = "split-pct-" + p._id;

      var extraInput = "";
      if (splitType === "custom") {
        extraInput = '<input type="number" id="' + amountId + '" class="split-custom-amount" data-pid="' + esc(p._id) + '" min="0" step="0.01" placeholder="0.00" style="width:90px;margin-left:auto" />';
      } else if (splitType === "percentage") {
        extraInput = '<input type="number" id="' + pctId + '" class="split-pct-amount" data-pid="' + esc(p._id) + '" min="0" max="100" step="0.01" placeholder="0" style="width:70px;margin-left:auto" /><span style="font-size:12px;margin-left:4px">%</span>';
      }

      row.innerHTML =
        '<label style="display:flex;align-items:center;gap:var(--space-3);flex:1;cursor:pointer" for="' + checkId + '">' +
        '<input type="checkbox" id="' + checkId + '" class="split-participant-check" data-pid="' + esc(p._id) + '" checked />' +
        '<div class="participant-avatar" style="width:28px;height:28px;font-size:11px">' + esc((p.name || "P").charAt(0).toUpperCase()) + '</div>' +
        '<span style="font-size:13px">' + esc(p.name) + '</span>' +
        '</label>' +
        (extraInput ? '<div style="display:flex;align-items:center">' + extraInput + '</div>' : '');

      container.appendChild(row);
    });
  }

  function showSplitModal() {
    document.getElementById("splitForm").reset();
    document.getElementById("splitDate").value = new Date().toISOString().slice(0, 10);

    var paidBySelect = document.getElementById("splitPaidBy");
    paidBySelect.innerHTML = state.participants.map(function (p) {
      return '<option value="' + esc(p._id) + '">' + esc(p.name) + '</option>';
    }).join("");

    buildSplitParticipantRows("equal");

    // FIX: re-attach onchange every time modal opens (avoid stale closures)
    document.getElementById("splitType").onchange = function (e) {
      buildSplitParticipantRows(e.target.value);
    };
    document.getElementById("splitSelectAllBtn").onclick = function () {
      document.querySelectorAll(".split-participant-check").forEach(function (cb) { cb.checked = true; });
    };

    openModal("splitModalBackdrop");
    setTimeout(function () {
      var titleField = document.getElementById("splitTitle");
      if (titleField) titleField.focus();
    }, 50);
  }

  async function saveSplitExpense(event) {
    if (event) event.preventDefault();
    var form = document.getElementById("splitForm");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var title = document.getElementById("splitTitle").value.trim();
    var amount = parseFloat(document.getElementById("splitAmount").value);
    var paidBy = document.getElementById("splitPaidBy").value;
    var splitType = document.getElementById("splitType").value;
    var date = document.getElementById("splitDate").value;
    var category = document.getElementById("splitCategory").value.trim();
    var description = document.getElementById("splitDescription").value.trim();

    if (!amount || amount <= 0) {
      notify("Enter a valid amount", "error");
      return;
    }

    var checkedBoxes = Array.from(document.querySelectorAll(".split-participant-check:checked"));
    if (!checkedBoxes.length) {
      notify("Select at least one participant to split with", "error");
      return;
    }

    var splits = checkedBoxes.map(function (cb) {
      var pid = cb.dataset.pid;
      var entry = { participantId: pid };
      if (splitType === "custom") {
        var amtEl = document.getElementById("split-amount-" + pid);
        entry.amount = amtEl ? parseFloat(amtEl.value) || 0 : 0;
      } else if (splitType === "percentage") {
        var pctEl = document.getElementById("split-pct-" + pid);
        entry.percentage = pctEl ? parseFloat(pctEl.value) || 0 : 0;
      }
      return entry;
    });

    var payload = {
      title: title,
      amount: amount,
      paidBy: paidBy,
      splitType: splitType,
      splits: splits,
      date: date,
      category: category,
      description: description
    };

    // FIX: guard against splitService not being defined
    if (typeof splitService === "undefined") {
      notify("Split service is not available", "error");
      return;
    }

    var button = document.getElementById("splitSaveBtn");
    setButtonLoading(button, true, "Add expense");

    try {
      await splitService.createExpense(state.selectedId, payload);
      closeModal("splitModalBackdrop");
      notify("Expense added", "success");
      state.detailTab = "expenses";
      await loadExpenses();
      await loadBalances();
      renderDetail();
    } catch (error) {
      notify(error.message || "Failed to add expense", "error");
    } finally {
      setButtonLoading(button, false, "Add expense");
    }
  }

  function showExpenseDetail(expense) {
    var currency = (state.selectedGroup && state.selectedGroup.currency) || "INR";
    document.getElementById("expenseDetailTitle").textContent = expense.title;
    document.getElementById("expenseDetailSubtitle").textContent = fmt(expense.amount, currency) + " on " + fmtDate(expense.date);

    var paidByName = expense.paidBy && expense.paidBy.name ? expense.paidBy.name : "Unknown";
    var splits = expense.splits || [];
    var rows = splits.map(function (s) {
      var name = s.participantId && s.participantId.name ? s.participantId.name : "Unknown";
      var pid = s.participantId && s.participantId._id ? s.participantId._id : (typeof s.participantId === "string" ? s.participantId : "");
      return '<div class="participant-item">' +
        '<div class="participant-avatar" style="width:28px;height:28px;font-size:11px">' + esc(name.charAt(0).toUpperCase()) + '</div>' +
        '<div class="participant-info">' +
        '<div class="participant-name">' + esc(name) + (s.settled ? ' <span class="badge badge-success">Settled</span>' : '') + '</div>' +
        '<div class="participant-email">' + fmt(s.amount, currency) + (s.percentage ? ' (' + s.percentage + '%)' : '') + '</div>' +
        '</div>' +
        '<div class="participant-actions">' +
        '<button class="btn btn-sm btn-ghost settle-toggle" data-expense-id="' + esc(expense._id) + '" data-participant-id="' + esc(pid) + '">' +
        (s.settled ? "Unsettle" : "Mark settled") + '</button>' +
        '</div></div>';
    }).join("");

    document.getElementById("expenseDetailBody").innerHTML =
      '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-3)">Paid by <strong>' + esc(paidByName) + '</strong> &bull; Split ' + esc(expense.splitType) + '</p>' +
      '<div class="participant-list">' + (rows || '<p style="font-size:13px;color:var(--text-secondary)">No splits recorded.</p>') + '</div>';

    // FIX: guard against splitService not being defined before attaching handlers
    if (typeof splitService !== "undefined") {
      document.querySelectorAll(".settle-toggle").forEach(function (btn) {
        btn.onclick = async function () {
          try {
            await splitService.toggleSettled(btn.dataset.expenseId, btn.dataset.participantId);
            closeModal("expenseDetailModalBackdrop");
            await loadExpenses();
            await loadBalances();
            renderDetail();
            notify("Settlement updated", "success");
          } catch (e) {
            notify(e.message || "Failed to update", "error");
          }
        };
      });
    }

    openModal("expenseDetailModalBackdrop");
  }

  async function archiveSelectedGroup() {
    if (!state.selectedId) return;
    try {
      await groupService.archiveGroup(state.selectedId);
      notify(state.selectedGroup && state.selectedGroup.isArchived ? "Group restored" : "Group archived", "success");
      await loadGroups(true);
    } catch (error) {
      notify(error.message || "Failed to archive group", "error");
    }
  }

  async function deleteSelectedGroup() {
    if (!state.selectedGroup) return;
    if (!window.confirm('Delete "' + state.selectedGroup.name + '" and all its participants?')) return;
    try {
      await groupService.deleteGroup(state.selectedId);
      state.selectedId = null;
      notify("Group deleted", "success");
      await loadGroups(false);
    } catch (error) {
      notify(error.message || "Failed to delete group", "error");
    }
  }

  async function removeParticipant(id) {
    var participant = state.participants.find(function (p) { return p._id === id; });
    if (!window.confirm("Remove " + (participant ? participant.name : "this participant") + "?")) return;
    try {
      await groupService.deleteParticipant(id);
      notify("Participant removed", "success");
      await loadGroups(true);
    } catch (error) {
      notify(error.message || "Failed to remove participant", "error");
    }
  }

  function bindCommonUi() {
    document.getElementById("logoutBtn").onclick = function () {
      if (typeof auth !== "undefined" && auth.logout) auth.logout();
    };
    document.getElementById("createGroupBtn").onclick = function () { showGroupModal(); };

    // FIX: Use addEventListener so these can be safely called multiple times
    document.getElementById("groupForm").addEventListener("submit", saveGroup);
    document.getElementById("participantForm").addEventListener("submit", saveParticipant);
    document.getElementById("linkForm").addEventListener("submit", linkParticipant);
    document.getElementById("splitForm").addEventListener("submit", saveSplitExpense);

    // FIX: use groupSaveBtn's onclick directly for the button click (the form submit handles Enter key)
    document.getElementById("groupSaveBtn").onclick = function (e) {
      // The form's submit event fires naturally; this just ensures clicking the button also works
      // when the button is outside the form in some browser quirks.
      var form = document.getElementById("groupForm");
      if (form && !form.contains(e.target)) saveGroup(e);
    };

    [
      ["groupModalBackdrop", "groupModalClose", "groupCancelBtn"],
      ["participantModalBackdrop", "participantModalClose", "participantCancelBtn"],
      ["linkModalBackdrop", "linkModalClose", "linkCancelBtn"],
      ["splitModalBackdrop", "splitModalClose", "splitCancelBtn"],
      ["expenseDetailModalBackdrop", "expenseDetailClose", "expenseDetailDone"]
    ].forEach(function (ids) {
      var backdrop = document.getElementById(ids[0]);
      var closeBtn = document.getElementById(ids[1]);
      var cancelBtn = document.getElementById(ids[2]);
      if (closeBtn) closeBtn.onclick = function () { closeModal(ids[0]); };
      if (cancelBtn) cancelBtn.onclick = function () { closeModal(ids[0]); };
      if (backdrop) {
        backdrop.addEventListener("click", function (e) {
          if (e.target === backdrop) closeModal(ids[0]);
        });
      }
    });

    // Escape key closes any open modal
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        [
          "groupModalBackdrop",
          "participantModalBackdrop",
          "linkModalBackdrop",
          "splitModalBackdrop",
          "expenseDetailModalBackdrop"
        ].forEach(function (id) {
          var el = document.getElementById(id);
          if (el && !el.classList.contains("hidden")) closeModal(id);
        });
      }
    });

    document.getElementById("groupSearch").oninput = function (e) {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(function () {
        state.search = e.target.value.trim();
        loadGroups(false);
      }, 300);
    };

    document.getElementById("archiveFilter").onchange = function (e) {
      state.archived = e.target.value;
      loadGroups(false);
    };

    // Theme toggle
    var root = document.documentElement;
    var savedTheme = localStorage.getItem("es-theme") || "light";
    function applyTheme(theme) {
      root.setAttribute("data-theme", theme);
      localStorage.setItem("es-theme", theme);
      var sun = document.getElementById("themeIconSun");
      var moon = document.getElementById("themeIconMoon");
      if (sun) sun.style.display = theme === "dark" ? "none" : "";
      if (moon) moon.style.display = theme === "dark" ? "" : "none";
    }
    applyTheme(savedTheme);
    document.getElementById("themeToggle").onclick = function () {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    };

    // Mobile sidebar
    var sidebar = document.getElementById("sidebar");
    var mobileButton = document.getElementById("mobileNavBtn");
    if (mobileButton && sidebar) {
      mobileButton.onclick = function () {
        var open = sidebar.classList.toggle("open");
        mobileButton.setAttribute("aria-expanded", String(open));
      };
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    // FIX: guard against auth not being defined
    if (typeof auth === "undefined") {
      toast.show("Auth module not loaded", "error");
      return;
    }
    var user = await auth.requireAuth();
    if (!user) return;
    state.currentUser = user;
    bindCommonUi();
    await loadGroups(false);
  });
})();