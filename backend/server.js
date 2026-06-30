const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const env = require("./src/config/env");

const app = express();

// Helmet security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "blob:"],
      "connect-src": ["'self'"]
    }
  }
}));

// Compress all HTTP responses
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: env.clientUrl || "http://localhost:5000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize input
const sanitize = require("./src/middleware/sanitize");
app.use(sanitize);

// Request logging
app.use(morgan("dev"));
const requestLogger = require("./src/middleware/requestLogger");
app.use(requestLogger);

// Rate limiting on all API routes
const rateLimiter = require("./src/middleware/rateLimiter");
app.use("/api", rateLimiter);

// Serve uploaded files (avatars, receipts)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend static files
const frontendPath = path.join(__dirname, "..", "frontend", "public");
app.use(express.static(frontendPath));

// Health check
app.get("/api/v1/health", (req, res) => {
  res.json({ success: true, message: "API is running", version: "1.0.0" });
});

// Lazy database connection for API routes only
let dbConnected = false;
app.use(async (req, res, next) => {
  if (!dbConnected && req.path.startsWith("/api")) {
    try {
      const db = require("./src/config/db");
      const logger = require("./src/utils/logger");
      await db.connectDB(env.mongoUri);
      dbConnected = true;
      logger.info("Database connected");
    } catch (error) {
      const logger = require("./src/utils/logger");
      logger.error(`DB connection failed: ${error.message}`);
      return res.status(500).json({ success: false, message: "Database connection failed" });
    }
  }
  next();
});

// Load API routes
try {
  const routes = require("./src/routes");
  app.use("/api/v1", routes);
  const logger = require("./src/utils/logger");
  logger.info("API routes loaded successfully");
} catch (error) {
  const logger = require("./src/utils/logger");
  logger.error(`Error loading routes: ${error.message}`);
  app.use("/api/v1", (req, res) => {
    res.status(500).json({ success: false, message: "Routes not available" });
  });
}

// SPA fallback: serve index.html for non-API, non-file routes
app.get("*", (req, res, next) => {
  // If it's an API route, let it fall through to 404
  if (req.path.startsWith("/api")) return next();
  // If the file has an extension (e.g. .js, .css, .png), let static middleware handle it (it already ran)
  if (path.extname(req.path)) return next();
  // Otherwise serve the requested HTML or fall back to login
  const requestedFile = path.join(frontendPath, req.path + ".html");
  const fs = require("fs");
  if (fs.existsSync(requestedFile)) {
    return res.sendFile(requestedFile);
  }
  res.sendFile(path.join(frontendPath, "login.html"));
});

// Error handlers
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = env.port || 5000;
  app.listen(PORT, () => {
    const logger = require("./src/utils/logger");
    logger.info(`Server running on port ${PORT}`);
    logger.info(`App: http://localhost:${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/api/v1/health`);
  });
}

// For Vercel / serverless
module.exports = app;