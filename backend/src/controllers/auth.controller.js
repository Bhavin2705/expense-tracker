const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const logger = require("../utils/logger");
const { validateRegister, validateLogin } = require("../validators/auth.validator");
const { COOKIE_NAME, cookieOptions } = require("../utils/authToken");

const createToken = (userId) => jwt.sign({ userId }, env.jwtSecret, { expiresIn: "7d" });

const setSessionCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, cookieOptions(env.nodeEnv === "production"));
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt
});

exports.register = async (req, res) => {
  try {
    const validationError = validateRegister(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ success: false, message: "Email already exists" });

    const user = await User.create({ name, email, password });
    const token = createToken(user._id);
    setSessionCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user: sanitizeUser(user) }
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
    logger.error(`Registration failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Unable to create account" });
  }
};

exports.login = async (req, res) => {
  try {
    const validationError = validateLogin(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user._id);
    setSessionCookie(res, token);
    return res.json({
      success: true,
      message: "Login successful",
      data: { user: sanitizeUser(user) }
    });
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Unable to sign in" });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/"
  });
  return res.json({ success: true, message: "Logout successful" });
};

exports.getCurrentUser = async (req, res) => {
  return res.json({ success: true, data: { user: req.user } });
};

exports.protectedRoute = async (req, res) => {
  return res.json({ success: true, data: { user: req.user } });
};
