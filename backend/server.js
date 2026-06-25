const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const env = require("./src/config/env");
const logger = require("./src/utils/logger");

if (!env.jwtSecret || env.jwtSecret === "change_me" || env.jwtSecret.length < 20) {
  logger.error("JWT_SECRET is missing or too weak. Please set a strong secret in .env");
}

const db = require("./src/config/db");
const routes = require("./src/routes");
const requestLogger = require("./src/middleware/requestLogger");
const rateLimiter = require("./src/middleware/rateLimiter");
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");
const pageAuth = require("./src/middleware/pageAuth");

const app = express();

// Connect to database only once (lazy connection)
let dbConnected = false;
const connectDatabase = async () => {
  if (!dbConnected) {
    try {
      await db.connectDB(env.mongoUri);
      dbConnected = true;
      logger.info("Database connected");
    } catch (error) {
      logger.error("Database connection failed:", error.message);
    }
  }
};

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    logger.error("DB connection middleware error:", error);
    next();
  }
});

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-inline'"]
      }
    }
  })
);

app.use(
  cors({
    origin: env.clientUrl || "*",
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));
app.use(requestLogger);
app.use(rateLimiter);

// Health check endpoint (no DB required)
app.get("/api/v1/health", (req, res) => {
  res.json({ success: true, message: "ExpenseSplit API is running", version: "1.0.0" });
});

// Try to serve frontend files (may not exist in serverless)
try {
  const frontendPath = path.join(__dirname, "../frontend/public");
  app.use(express.static(frontendPath, { index: false }));
} catch (error) {
  logger.warn("Frontend path not found:", error.message);
}

try {
  app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
  app.use('/uploads/receipts', express.static(path.join(__dirname, 'uploads/receipts')));
} catch (error) {
  logger.warn("Uploads path not found:", error.message);
}

// API routes (priority over static files)
app.use("/api/v1", routes);

// Frontend page routes
try {
  const frontendPath = path.join(__dirname, "../frontend/public");
  
  app.get("/", (req, res) => {
    res.redirect("/dashboard.html");
  });

  app.get("/index.html", (req, res) => {
    res.redirect("/dashboard.html");
  });

  const privatePages = [
    "/dashboard.html",
    "/expenses.html",
    "/groups.html",
    "/profile.html"
  ];

  app.get(privatePages, pageAuth, (req, res) => {
    res.sendFile(path.join(frontendPath, path.basename(req.path)));
  });
} catch (error) {
  logger.warn("Frontend routes not available:", error.message);
}

app.use(notFound);
app.use(errorHandler);

// Export for Vercel (serverless)
module.exports = app;

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = env.port || 5000;
  const server = app.listen(PORT, async () => {
    await connectDatabase();
    console.log(`ExpenseSplit running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received`);
    server.close(async () => {
      await db.disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}