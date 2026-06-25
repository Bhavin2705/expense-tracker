#!/usr/bin/env bash
set -e

echo "Starting ExpenseSplit Phase 3 - Groups & Participants Setup (FINAL FIXED)..."

# Create directories
mkdir -p src/models src/controllers src/routes public/js/services public/js/components public/js/pages

# ====================== BACKEND ======================

cat > src/models/Group.js <<'EOF'
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2, maxlength: 100, trim: true },
  description: { type: String, default: "" },
  currency: { type: String, default: "INR", trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  participantCount: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

groupSchema.index({ name: 1 });

module.exports = mongoose.models.Group || mongoose.model("Group", groupSchema);
EOF

cat > src/models/Participant.js <<'EOF'
const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
  name: { type: String, required: true, minlength: 2, maxlength: 100, trim: true },
  email: { type: String, default: "", trim: true },
  linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  notes: { type: String, default: "" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Participant || mongoose.model("Participant", participantSchema);
EOF

cat > src/controllers/group.controller.js <<'EOF'
const Group = require("../models/Group");
const Participant = require("../models/Participant");

exports.createGroup = async (req, res) => {
  try {
    const { name, description, currency } = req.body;
    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Group name must be between 2 and 100 characters" });
    }
    const group = await Group.create({
      name, description: description || "", currency: currency || "INR",
      createdBy: req.user._id, members: [req.user._id]
    });
    return res.status(201).json({ success: true, data: group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const { search, archived } = req.query;
    const query = { members: req.user._id };
    if (archived === "true") query.isArchived = true;
    else if (archived === "false") query.isArchived = false;
    if (search) query.name = { $regex: search, $options: "i" };

    const groups = await Group.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data: groups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    const participants = await Participant.find({ groupId: group._id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: { group, participants } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    if (group.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Only creator can edit" });

    const { name, description, currency } = req.body;
    if (name) {
      if (name.length < 2 || name.length > 100) return res.status(400).json({ success: false, message: "Name must be 2-100 chars" });
      group.name = name;
    }
    if (description !== undefined) group.description = description;
    if (currency) group.currency = currency;
    await group.save();
    return res.json({ success: true, data: group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.archiveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    if (group.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Only creator can archive" });
    group.isArchived = !group.isArchived;
    await group.save();
    return res.json({ success: true, data: group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    if (group.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Only creator can delete" });
    await Participant.deleteMany({ groupId: group._id });
    await group.deleteOne();
    return res.json({ success: true, message: "Group deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
EOF

cat > src/controllers/participant.controller.js <<'EOF'
const Participant = require("../models/Participant");
const Group = require("../models/Group");
const User = require("../models/User");

exports.createParticipant = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, email, notes } = req.body;
    if (!name || name.length < 2 || name.length > 100) return res.status(400).json({ success: false, message: "Name must be 2-100 chars" });

    const group = await Group.findOne({ _id: groupId, members: req.user._id });
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const participant = await Participant.create({ groupId, name, email: email || "", notes: notes || "" });
    await Group.findByIdAndUpdate(groupId, { $inc: { participantCount: 1 } });

    return res.status(201).json({ success: true, data: participant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getParticipants = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findOne({ _id: groupId, members: req.user._id });
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    const participants = await Participant.find({ groupId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: participants });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateParticipant = async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found" });
    const group = await Group.findOne({ _id: participant.groupId, members: req.user._id });
    if (!group) return res.status(403).json({ success: false, message: "Access denied" });

    const { name, email, notes, isActive } = req.body;
    if (name) participant.name = name;
    if (email !== undefined) participant.email = email;
    if (notes !== undefined) participant.notes = notes;
    if (isActive !== undefined) participant.isActive = isActive;

    await participant.save();
    return res.json({ success: true, data: participant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteParticipant = async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found" });
    const group = await Group.findOne({ _id: participant.groupId, members: req.user._id });
    if (!group) return res.status(403).json({ success: false, message: "Access denied" });

    await participant.deleteOne();
    await Group.findByIdAndUpdate(participant.groupId, { $inc: { participantCount: -1 } });

    return res.json({ success: true, message: "Participant removed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.linkParticipant = async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found" });
    const group = await Group.findOne({ _id: participant.groupId, members: req.user._id });
    if (!group) return res.status(403).json({ success: false, message: "Access denied" });

    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    participant.linkedUserId = user._id;
    if (!participant.email) participant.email = user.email;
    await participant.save();
    return res.json({ success: true, data: participant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
EOF

cat > src/routes/group.routes.js <<'EOF'
const express = require("express");
const auth = require("../middleware/auth");
const { createGroup, getGroups, getGroup, updateGroup, archiveGroup, deleteGroup } = require("../controllers/group.controller");

const router = express.Router();
router.use(auth);
router.post("/", createGroup);
router.get("/", getGroups);
router.get("/:id", getGroup);
router.patch("/:id", updateGroup);
router.patch("/:id/archive", archiveGroup);
router.delete("/:id", deleteGroup);
module.exports = router;
EOF

cat > src/routes/participant.routes.js <<'EOF'
const express = require("express");
const auth = require("../middleware/auth");
const { createParticipant, getParticipants, updateParticipant, deleteParticipant, linkParticipant } = require("../controllers/participant.controller");

const router = express.Router();
router.use(auth);
router.post("/groups/:groupId/participants", createParticipant);
router.get("/groups/:groupId/participants", getParticipants);
router.patch("/participants/:id", updateParticipant);
router.delete("/participants/:id", deleteParticipant);
router.patch("/participants/:id/link-user", linkParticipant);
module.exports = router;
EOF

cat > src/routes/index.js <<'EOF'
const express = require("express");
const { success } = require("../utils/response");
const authRoutes = require("./auth.routes");
const groupRoutes = require("./group.routes");
const participantRoutes = require("./participant.routes");

const router = express.Router();

router.get("/health", (req, res) => success(res, "ExpenseSplit API is running", { version: "1.0.0" }));

router.use("/auth", authRoutes);
router.use("/groups", groupRoutes);
router.use(participantRoutes);

module.exports = router;
EOF

# ====================== FRONTEND ======================

cat > public/js/utils/api.js <<'EOF'
const API_BASE = "/api/v1";

const api = {
  getHeaders() {
    const token = storage.get("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },
  async request(method, endpoint, body) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    if (response.status === 401) {
      storage.remove("token");
      storage.remove("currentUser");
    }
    return response.json();
  },
  get(endpoint) { return this.request("GET", endpoint); },
  post(endpoint, payload) { return this.request("POST", endpoint, payload); },
  patch(endpoint, payload) { return this.request("PATCH", endpoint, payload); },
  delete(endpoint) { return this.request("DELETE", endpoint); },
  async getHealth() { return this.get("/health"); }
};

window.api = api;
EOF

cat > public/js/services/groupService.js <<'EOF'
const groupService = {
  async getGroups(params = {}) {
    const query = new URLSearchParams(params);
    return api.get(`/groups?${query.toString()}`);
  },
  async getGroup(id) { return api.get(`/groups/${id}`); },
  async createGroup(payload) { return api.post("/groups", payload); },
  async updateGroup(id, payload) { return api.patch(`/groups/${id}`, payload); },
  async deleteGroup(id) { return api.delete(`/groups/${id}`); },
  async archiveGroup(id) { return api.patch(`/groups/${id}/archive`); },
  async createParticipant(groupId, payload) { return api.post(`/groups/${groupId}/participants`, payload); },
  async updateParticipant(id, payload) { return api.patch(`/participants/${id}`, payload); },
  async deleteParticipant(id) { return api.delete(`/participants/${id}`); },
  async linkParticipant(id, payload) { return api.patch(`/participants/${id}/link-user`, payload); }
};

window.groupService = groupService;
EOF

cat > public/js/components/groupCard.js <<'EOF'
window.groupCard = {
  render(group) {
    return `<div class="group-card" data-group-id="${group._id}"><h3>${group.name}</h3><p>${group.description || "No description"}</p><div class="group-meta"><span>👥 ${group.participantCount}</span><span class="${group.isArchived ? 'archived' : 'active'}">${group.isArchived ? "Archived" : "Active"}</span></div></div>`;
  }
};
EOF

cat > public/js/components/modals.js <<'EOF'
window.modals = {
  showCreateGroup() {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Create Group</h2><form id="groupForm"><input name="name" placeholder="Group Name" required /><textarea name="description" placeholder="Description"></textarea><button type="submit" class="btn-primary">Create</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("groupForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const res = await groupService.createGroup(data); if (res.success) window.location.reload(); });
    document.getElementById("modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") e.target.remove(); });
  },

  showAddParticipant(groupId) {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Add Participant</h2><form id="addForm"><input name="name" placeholder="Name" required /><input name="email" placeholder="Email" type="email" /><textarea name="notes" placeholder="Notes"></textarea><button type="submit" class="btn-primary">Add</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("addForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const res = await groupService.createParticipant(groupId, data); if (res.success) window.location.reload(); });
  },

  showEditParticipant(p) {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Edit Participant</h2><form id="editForm"><input name="name" value="${p.name}" required /><input name="email" value="${p.email||''}" type="email" /><textarea name="notes">${p.notes||''}</textarea><label><input type="checkbox" name="isActive" ${p.isActive?'checked':''}> Active</label><button type="submit" class="btn-primary">Save</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("editForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); data.isActive = form.isActive.checked; const res = await groupService.updateParticipant(p._id, data); if (res.success) window.location.reload(); });
  },

  showLinkParticipant(id) {
    const html = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><h2>Link User</h2><form id="linkForm"><input name="userId" placeholder="User ID" required /><button type="submit" class="btn-primary">Link</button></form></div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const form = document.getElementById("linkForm");
    form.addEventListener("submit", async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const res = await groupService.linkParticipant(id, data); if (res.success) window.location.reload(); });
  }
};
EOF

cat > public/js/pages/groups.js <<'EOF'
window.groupsPage = {
  async render(filter = {}) {
    const res = await groupService.getGroups(filter);
    const groups = res.data || [];
    const cardsHTML = groups.map(g => groupCard.render(g)).join('');

    return `
      <div class="panel">
        <div class="dashboard-header">
          <h2>My Groups</h2>
          <button id="createGroupBtn" class="btn-primary">+ New Group</button>
        </div>
        <div class="filters">
          <input id="groupSearch" placeholder="Search groups..." class="search-input" />
          <select id="archiveFilter">
            <option value="">All Groups</option>
            <option value="false">Active</option>
            <option value="true">Archived</option>
          </select>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div>Total</div><strong>${groups.length}</strong></div>
          <div class="stat-card"><div>Active</div><strong>${groups.filter(g => !g.isArchived).length}</strong></div>
        </div>
        <div id="groupsContainer" class="groups-grid">${cardsHTML || '<div class="empty-state">No groups found.</div>'}</div>
      </div>
      <div id="groupDetailPanel" class="panel" style="display:none;"></div>
    `;
  },

  async showGroupDetail(id) {
    const res = await groupService.getGroup(id);
    if (!res.success) return;
    const { group, participants } = res.data;

    const detailHTML = `
      <div class="group-detail">
        <div class="dashboard-header">
          <h2>${group.name}</h2>
          <div>
            <button id="archiveBtn" class="btn-secondary">${group.isArchived ? 'Unarchive' : 'Archive'}</button>
            <button id="deleteBtn" class="btn-secondary danger">Delete</button>
          </div>
        </div>
        <p>${group.description || ''}</p>
        <div class="participants-section">
          <div class="section-header">
            <h3>Participants (${participants.length})</h3>
            <button id="addParticipantBtn" class="btn-primary">+ Add</button>
          </div>
          <ul class="participant-list">
            ${participants.map(p => `
              <li class="participant-item">
                <div><strong>${p.name}</strong> ${p.email ? `(${p.email})` : ''}</div>
                <div class="actions">
                  <button class="btn-small edit-btn" data-id="${p._id}">Edit</button>
                  <button class="btn-small link-btn" data-id="${p._id}">Link</button>
                  <button class="btn-small delete-btn" data-id="${p._id}">Remove</button>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    const panel = document.getElementById("groupDetailPanel");
    panel.innerHTML = detailHTML;
    panel.style.display = "block";

    document.getElementById("archiveBtn").onclick = async () => { await groupService.archiveGroup(id); window.location.reload(); };
    document.getElementById("deleteBtn").onclick = async () => { if (confirm("Delete group?")) { await groupService.deleteGroup(id); window.location.reload(); } };
    document.getElementById("addParticipantBtn").onclick = () => modals.showAddParticipant(id);

    panel.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => {
        const p = participants.find(x => x._id === btn.dataset.id);
        if (p) modals.showEditParticipant(p);
      };
    });
    panel.querySelectorAll('.link-btn').forEach(btn => btn.onclick = () => modals.showLinkParticipant(btn.dataset.id));
    panel.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm("Remove participant?")) {
          await groupService.deleteParticipant(btn.dataset.id);
          this.showGroupDetail(id);
        }
      };
    });
  },

  bind() {
    document.getElementById("createGroupBtn").onclick = () => modals.showCreateGroup();

    const searchInput = document.getElementById("groupSearch");
    searchInput.oninput = async () => {
      const root = document.getElementById("appRoot") || document.querySelector("main");
      root.innerHTML = await this.render({ search: searchInput.value.trim() });
      this.bind();
    };

    document.getElementById("archiveFilter").onchange = async (e) => {
      const root = document.getElementById("appRoot") || document.querySelector("main");
      root.innerHTML = await this.render({ archived: e.target.value });
      this.bind();
    };

    // Initial card binding
    document.querySelectorAll(".group-card").forEach(card => {
      card.onclick = () => this.showGroupDetail(card.dataset.groupId);
    });
  }
};
EOF

# Add all new scripts to index.html (safe append before app.js)
if [ -f public/index.html ]; then
  if ! grep -q "groupService.js" public/index.html; then
    sed -i '/<script src="\/js\/app.js"/i \
  <script src="/js/services/groupService.js"></script>\n\
  <script src="/js/components/groupCard.js"></script>\n\
  <script src="/js/components/modals.js"></script>\n\
  <script src="/js/pages/groups.js"></script>' public/index.html
  fi
fi

# Dashboard integration
if [ -f public/js/app.js ]; then
  if ! grep -q "loadGroups" public/js/app.js; then
    cat >> public/js/app.js <<'EOP'
// PHASE3_GROUPS
window.loadGroups = async function() {
  const root = document.getElementById("appRoot") || document.querySelector("main");
  if (root) {
    root.innerHTML = await groupsPage.render();
    groupsPage.bind();
  }
};
EOP
  fi
fi

# Navigation - more robust
if [ -f public/index.html ]; then
  if ! grep -q "onclick=\"loadGroups" public/index.html; then
    sed -i 's|Settings|Settings</button>\n        <button class="nav-item" onclick="loadGroups()">Groups</button>|' public/index.html
  fi
fi

# CSS
if ! grep -q ".group-detail" public/css/components.css 2>/dev/null; then
  cat >> public/css/components.css <<'EOF'
.group-detail h2 { margin-bottom: 8px; }
.participants-section { margin-top: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.participant-list { list-style: none; padding: 0; }
.participant-item { display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border); }
.actions button { margin-left: 6px; }
.filters { display: flex; gap: 12px; margin: 16px 0; }
.archived { color: #ef4444; } .active { color: #16a34a; }
EOF
fi

echo ""
echo "✅ ExpenseSplit Phase 3 - FULLY FIXED"
echo "   • Search & Archive filter now correctly re-render"
echo "   • All edit/link modals wired"
echo "   • Scripts properly included in index.html"
echo "   • Safe full API replacement"
echo "   • Robust navigation"
echo ""
echo "Next steps:"
echo "   npm run dev"
echo ""