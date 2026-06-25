const express = require("express");
const path = require("path");

const app = express();

// Simple health check first
app.get("/api/v1/health", (req, res) => {
  res.json({ success: true, message: "API is running", version: "1.0.0" });
});

// Try to load other dependencies
try {
  const helmet = require("helmet");
  const cors = require("cors");
  const morgan = require("morgan");
  
  const env = require("./src/config/env");
  const logger = require("./src/utils/logger");
  const db = require("./src/config/db");
  const routes = require("./src/routes");
  const notFound = require("./src/middleware/notFound");
  const errorHandler = require("./src/middleware/errorHandler");

  // Setup middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-inline'"]
      }
    }
  }));

  app.use(cors({
    origin: env.clientUrl || "*",
    credentials: true
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));

  // Lazy database connection
  let dbConnected = false;
  app.use(async (req, res, next) => {
    if (!dbConnected && req.path.startsWith("/api")) {
      try {
        await db.connectDB(env.mongoUri);
        dbConnected = true;
        logger.info("Database connected");
      } catch (error) {
        logger.error("DB connection failed:", error.message);
      }
    }
    next();
  });

  // API routes
  app.use("/api/v1", routes);

  // Error handlers
  app.use(notFound);
  app.use(errorHandler);
} catch (error) {
  console.error("Error loading modules:", error.message);
  // Continue without full setup
}

module.exports = app;

// Local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}