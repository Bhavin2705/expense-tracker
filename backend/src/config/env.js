require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/expense-split",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5000",
  jwtSecret: process.env.JWT_SECRET || "fallback-super-secret-jwt-key-change-this-in-production",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "fallback-refresh-secret-change-in-production",
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
};