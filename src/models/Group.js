const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    default: "",
    maxlength: 500,
    trim: true
  },
  currency: {
    type: String,
    default: "INR",
    trim: true,
    uppercase: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  participantCount: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  // === Invite System ===
  inviteCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    minlength: 6,
    maxlength: 12
  },
  inviteExpiry: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Auto-add creator to admins and members
groupSchema.pre("save", function (next) {
  if (this.isNew) {
    if (!this.admins || this.admins.length === 0) {
      this.admins = [this.createdBy];
    }
    if (!this.members || this.members.length === 0) {
      this.members = [this.createdBy];
    }
    if (!this.inviteCode) {
      this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }
  }
  next();
});

groupSchema.index({ members: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ inviteCode: 1 });

module.exports = mongoose.models.Group || mongoose.model("Group", groupSchema);