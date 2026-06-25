// src/routes/profile.routes.js
// All routes are protected — require a valid session/JWT

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');   // your existing auth middleware
const ctrl = require('../controllers/profile.controller');

// ── All profile routes require authentication ─────────────────
router.use(auth);

// GET  /api/v1/profile          → fetch current user's profile
router.get('/', ctrl.getProfile);

// PATCH /api/v1/profile         → update name / email
router.patch('/', ctrl.updateProfile);

// PATCH /api/v1/profile/password → change password
router.patch('/password', ctrl.changePassword);

// POST  /api/v1/profile/avatar  → upload profile photo
// The multer middleware runs before the handler; errors are caught by errorHandler
router.post(
    '/avatar',
    ctrl.uploadAvatarMiddleware,
    ctrl.uploadAvatar
);

// DELETE /api/v1/profile/avatar → remove profile photo
router.delete('/avatar', ctrl.removeAvatar);

// DELETE /api/v1/profile        → delete account permanently
router.delete('/', ctrl.deleteAccount);

module.exports = router;
