const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const logger = require("../utils/logger");
const { validateRegister, validateLogin } = require("../validators/auth.validator");
const { COOKIE_NAME, cookieOptions } = require("../utils/authToken");
const { seedDefaultCategories } = require("../helpers/seedCategories");

// Token creation helpers
const createAccessToken = (userId, role) =>
  jwt.sign({ userId, role, type: "access" }, env.jwtSecret, { expiresIn: env.accessTokenExpiry });

const createRefreshToken = (userId) =>
  jwt.sign({ userId, type: "refresh" }, env.refreshTokenSecret, { expiresIn: env.refreshTokenExpiry });

const getRefreshTokenExpiry = () => {
  // Parse env.refreshTokenExpiry (e.g., "7d") to a Date
  const match = env.refreshTokenExpiry.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + value * (multipliers[unit] || 86400000));
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = env.nodeEnv === "production";

  // Access token cookie (short-lived)
  res.cookie(COOKIE_NAME, accessToken, {
    ...cookieOptions(isProduction),
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  // Refresh token cookie (long-lived, httpOnly)
  res.cookie("expensesplit_refresh", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearTokenCookies = (res) => {
  const isProduction = env.nodeEnv === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
  });
  res.clearCookie("expensesplit_refresh", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/v1/auth"
  });
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt
});

// ── REGISTER ─────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const validationError = validateRegister(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const user = await User.create({ name, email, password, role: "user" });

    // Seed default categories for the new user
    await seedDefaultCategories(user._id);

    // Generate tokens
    const accessToken = createAccessToken(user._id, user.role);
    const refreshToken = createRefreshToken(user._id);

    // Store refresh token
    user.addRefreshToken(refreshToken, getRefreshTokenExpiry());
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    logger.info(`User registered: ${email}`);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
    logger.error(`Registration failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Unable to create account" });
  }
};

// ── LOGIN ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const validationError = validateLogin(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const user = await User.findOne({ email }).select("+password +refreshTokens");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();

    // Generate tokens
    const accessToken = createAccessToken(user._id, user.role);
    const refreshToken = createRefreshToken(user._id);

    // Store refresh token
    user.addRefreshToken(refreshToken, getRefreshTokenExpiry());
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    logger.info(`User logged in: ${email}`);

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Unable to sign in" });
  }
};

// ── REFRESH TOKEN ────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie or request body
    const token = req.cookies?.expensesplit_refresh || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, env.refreshTokenSecret);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    if (decoded.type !== "refresh") {
      return res.status(401).json({ success: false, message: "Invalid token type" });
    }

    // Find user and check if refresh token is stored
    const user = await User.findById(decoded.userId).select("+refreshTokens");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or inactive" });
    }

    const storedToken = user.refreshTokens.find(t => t.token === token);
    if (!storedToken) {
      // Token reuse detected — clear all refresh tokens (security measure)
      user.refreshTokens = [];
      await user.save();
      logger.warn(`Refresh token reuse detected for user ${user._id}`);
      return res.status(401).json({ success: false, message: "Token has been revoked" });
    }

    // Rotate: remove old token, issue new ones
    user.removeRefreshToken(token);
    const newAccessToken = createAccessToken(user._id, user.role);
    const newRefreshToken = createRefreshToken(user._id);
    user.addRefreshToken(newRefreshToken, getRefreshTokenExpiry());
    await user.save();

    setTokenCookies(res, newAccessToken, newRefreshToken);

    return res.json({
      success: true,
      message: "Tokens refreshed",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error(`Token refresh failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Unable to refresh token" });
  }
};

// ── LOGOUT ───────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    // Remove the refresh token from DB if user is authenticated
    const refreshTokenValue = req.cookies?.expensesplit_refresh || req.body?.refreshToken;
    if (refreshTokenValue) {
      try {
        const decoded = jwt.verify(refreshTokenValue, env.refreshTokenSecret);
        const user = await User.findById(decoded.userId).select("+refreshTokens");
        if (user) {
          user.removeRefreshToken(refreshTokenValue);
          await user.save();
        }
      } catch (e) {
        // Token may be expired, that's fine
      }
    }
  } catch (e) {
    // Ignore errors during logout cleanup
  }

  clearTokenCookies(res);
  return res.json({ success: true, message: "Logout successful" });
};

// ── GET CURRENT USER ─────────────────────────────────────────
exports.getCurrentUser = async (req, res) => {
  return res.json({ success: true, data: { user: sanitizeUser(req.user) } });
};
