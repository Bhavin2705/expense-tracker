const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const { COOKIE_NAME, getAuthToken } = require("../utils/authToken");

const clearSession = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/"
  });
};

const pageAuth = async (req, res, next) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.redirect("/login.html");

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.userId).select("_id isActive");
    if (!user || !user.isActive) {
      clearSession(res);
      return res.redirect("/login.html");
    }

    return next();
  } catch (error) {
    clearSession(res);
    return res.redirect("/login.html");
  }
};

module.exports = pageAuth;
