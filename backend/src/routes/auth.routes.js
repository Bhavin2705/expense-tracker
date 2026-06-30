const express = require("express");
const auth = require("../middleware/auth");
const authRateLimiter = require("../middleware/authRateLimiter");
const {
  register, login, logout, getCurrentUser, refreshToken
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/me", auth, getCurrentUser);

module.exports = router;
