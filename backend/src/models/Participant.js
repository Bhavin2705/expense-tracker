const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
  name: { type: String, required: true, minlength: 2, maxlength: 100, trim: true },
  email: { type: String, default: "", trim: true },
  linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  notes: { type: String, default: "", maxlength: 500 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Participant || mongoose.model("Participant", participantSchema);
