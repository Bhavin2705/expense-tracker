const express = require("express");
const path = require("path");

const app = express();

// Health check - always works
app.get("/api/v1/health", (req, res) => {
  res.json({ success: true, message: "API is running", version: "1.0.0" });
});

// Root redirect
app.get("/", (req, res) => {
  res.json({ message: "ExpenseSplit API. Visit /api/v1/health" });
});

// Load other modules safely
try {
  const helmet = require("helmet");
  const cors = require("cors");
  const morgan = require("morgan");
  const env = require("./src/config/env");
  
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
        console.error("DB connection failed:", error.message);
      }
    }
    next();
  });

  // API routes
  const routes = require("./src/routes");
  app.use("/api/v1", routes);

  // Error handlers
  const notFound = require("./src/middleware/notFound");
  const errorHandler = require("./src/middleware/errorHandler");
  app.use(notFound);
  app.use(errorHandler);
} catch (error) {
  console.error("Error loading dependencies:", error.message);
  // Still serve health endpoint
  app.get("/api/v1/health", (req, res) => {
    res.json({ success: true, message: "Basic API running", version: "1.0.0" });
  });
}

// Export for Vercel serverless
module.exports = app;

// Local development only
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}