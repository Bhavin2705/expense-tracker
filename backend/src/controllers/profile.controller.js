// src/controllers/profile.controller.js
// Handles: GET/PATCH /profile, PATCH /profile/password,
//          POST/DELETE /profile/avatar, DELETE /profile

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

// ── Multer setup for avatar uploads ──────────────────────────
const multer = require('multer');

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');
// Ensure directory exists at startup (wrapped for serverless compatibility)
try {
  if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
} catch (err) {
  console.warn('Could not create avatar directory:', err.message);
}

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) { cb(null, AVATAR_DIR); },
    filename: function (req, file, cb) {
        var ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, 'avatar-' + req.user._id + '-' + Date.now() + ext);
    }
});

const fileFilter = function (_req, file, cb) {
    var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new AppError('Only JPEG, PNG, WebP, and GIF images are allowed', 400));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

exports.uploadAvatarMiddleware = upload.single('avatar');

// ── Helper: strip sensitive fields ───────────────────────────
function safeUser(user) {
    var obj = user.toObject ? user.toObject() : Object.assign({}, user);
    delete obj.password;
    delete obj.__v;
    return obj;
}

// ── GET /api/v1/profile ───────────────────────────────────────
// ── GET /api/v1/profile ───────────────────────────────────────
exports.getProfile = asyncHandler(async function (req, res) {
    console.log("=== getProfile called ===");
    console.log("req.user:", req.user);

    if (!req.user || !req.user._id) {
        console.log("No user in req");
        throw new AppError('Authentication required', 401);
    }

    try {
        const user = await User.findById(req.user._id)
            .select('-password -__v')
            .lean();

        console.log("User found:", !!user);

        if (!user) throw new AppError('User not found', 404);

        sendSuccess(res, 200, { user });
        console.log("Profile sent successfully");
    } catch (err) {
        console.error("Error in getProfile:", err);
        throw err;
    }
});

// ── PATCH /api/v1/profile ─────────────────────────────────────
exports.updateProfile = asyncHandler(async function (req, res) {
    var { name, email } = req.body;

    if (!name || !name.trim()) throw new AppError('Name is required', 400);
    if (!email || !email.trim()) throw new AppError('Email is required', 400);

    // Check email uniqueness (excluding current user)
    var emailLower = email.trim().toLowerCase();
    var existing = await User.findOne({ email: emailLower, _id: { $ne: req.user._id } });
    if (existing) throw new AppError('That email is already in use by another account', 409);

    var user = await User.findByIdAndUpdate(
        req.user._id,
        { name: name.trim(), email: emailLower },
        { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, 200, { user: safeUser(user) });
});

// ── PATCH /api/v1/profile/password ───────────────────────────
exports.changePassword = asyncHandler(async function (req, res) {
    var { currentPassword, newPassword } = req.body;

    if (!currentPassword) throw new AppError('Current password is required', 400);
    if (!newPassword) throw new AppError('New password is required', 400);
    if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters', 400);

    // Fetch with password field (normally excluded)
    var user = await User.findById(req.user._id).select('+password');
    if (!user) throw new AppError('User not found', 404);

    var match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new AppError('Current password is incorrect', 401);

    var sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) throw new AppError('New password must be different from your current one', 400);

    var hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save();

    sendSuccess(res, 200, { message: 'Password updated successfully' });
});

// ── POST /api/v1/profile/avatar ───────────────────────────────
exports.uploadAvatar = asyncHandler(async function (req, res) {
    if (!req.file) throw new AppError('No file uploaded', 400);

    // Delete old avatar file if it exists and is locally stored
    var user = await User.findById(req.user._id).select('-password -__v');
    if (!user) throw new AppError('User not found', 404);

    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
        var oldPath = path.join(__dirname, '../../', user.avatar);
        fs.unlink(oldPath, function () { }); // silent — file may already be gone
    }

    // Build public URL for the new avatar
    var avatarUrl = '/uploads/avatars/' + req.file.filename;

    var updated = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: avatarUrl },
        { new: true }
    ).select('-password -__v');

    sendSuccess(res, 200, { user: safeUser(updated) });
});

// ── DELETE /api/v1/profile/avatar ────────────────────────────
exports.removeAvatar = asyncHandler(async function (req, res) {
    var user = await User.findById(req.user._id).select('-password -__v');
    if (!user) throw new AppError('User not found', 404);

    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
        var filePath = path.join(__dirname, '../../', user.avatar);
        fs.unlink(filePath, function () { });
    }

    var updated = await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { avatar: '' } },
        { new: true }
    ).select('-password -__v');

    sendSuccess(res, 200, { user: safeUser(updated) });
});

// ── DELETE /api/v1/profile ────────────────────────────────────
exports.deleteAccount = asyncHandler(async function (req, res) {
    var user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404);

    // Clean up avatar file
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
        var filePath = path.join(__dirname, '../../', user.avatar);
        fs.unlink(filePath, function () { });
    }

    // NOTE: You may want to cascade-delete groups, participants, expenses here
    // For now we just remove the user document
    await User.findByIdAndDelete(req.user._id);

    // Clear auth cookie
    res.clearCookie('token');
    sendSuccess(res, 200, { message: 'Account deleted successfully' });
});