const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Only log real server errors (500+), not 404s
  if (statusCode >= 500) {
    logger.error(err.message, {
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  } else if (statusCode === 404) {
    logger.warn(`404 - ${req.method} ${req.originalUrl}`);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Don't expose stack in production
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;