window.modals = {
  showCreateGroup() {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Create Group</h2><form id="groupForm"><div class="form-group"><label>Name</label><input name="name" placeholder="Group name" required /></div><div class="form-group"><label>Description</label><textarea name="description" placeholder="Description"></textarea></div><div class="form-group"><label>Currency</label><input name="currency" value="INR" maxlength="8" /></div><button type="submit" class="btn-primary">Create</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("groupForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const res = await groupService.createGroup(data); if (res.success) window.location.reload(); });
    document.getElementById("modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") e.target.remove(); });
  },

  showEditGroup(group) {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Edit Group</h2><form id="editGroupForm"><div class="form-group"><label>Name</label><input name="name" value="${group.name || ''}" required /></div><div class="form-group"><label>Description</label><textarea name="description">${group.description || ''}</textarea></div><div class="form-group"><label>Currency</label><input name="currency" value="${group.currency || 'INR'}" maxlength="8" /></div><button type="submit" class="btn-primary">Save Changes</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("editGroupForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const res = await groupService.updateGroup(group._id, data); if (res.success) window.location.reload(); });
    document.getElementById("modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") e.target.remove(); });
  },

  showAddParticipant(groupId) {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Add Participant</h2><form id="addForm"><div class="form-group"><label>Name</label><input name="name" placeholder="Name" required /></div><div class="form-group"><label>Email</label><input name="email" placeholder="Email" type="email" /></div><div class="form-group"><label>Notes</label><textarea name="notes" placeholder="Notes"></textarea></div><button type="submit" class="btn-primary">Add Participant</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("addForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const res = await groupService.createParticipant(groupId, data); if (res.success) window.location.reload(); });
    document.getElementById("modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") e.target.remove(); });
  },

  showEditParticipant(p) {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Edit Participant</h2><form id="editForm"><div class="form-group"><label>Name</label><input name="name" value="${p.name}" required /></div><div class="form-group"><label>Email</label><input name="email" value="${p.email||''}" type="email" /></div><div class="form-group"><label>Notes</label><textarea name="notes">${p.notes||''}</textarea></div><label><input type="checkbox" name="isActive" ${p.isActive?'checked':''}> Active</label><button type="submit" class="btn-primary">Save Changes</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("editForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); data.isActive = form.isActive.checked; const res = await groupService.updateParticipant(p._id, data); if (res.success) window.location.reload(); });
    document.getElementById("modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") e.target.remove(); });
  },

  showLinkParticipant(id) {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Link User</h2><form id="linkForm"><div class="form-group"><label>User ID</label><input name="userId" placeholder="User ID" required /></div><button type="submit" class="btn-primary">Link User</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("linkForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const res = await groupService.linkParticipant(id, data); if (res.success) window.location.reload(); });
    document.getElementById("modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") e.target.remove(); });
  }
};
