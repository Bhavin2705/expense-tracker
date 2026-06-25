const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const env = require("./src/config/env");
const logger = require("./src/utils/logger");

if (!env.jwtSecret || env.jwtSecret === "change_me" || env.jwtSecret.length < 20) {
  logger.error("JWT_SECRET is missing or too weak. Please set a strong secret in .env");
  console.error("JWT_SECRET validation failed. Update .env and restart.");
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
      if (process.env.NODE_ENV !== "production") {
        throw error;
      }
    }
  }
};

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  await connectDatabase();
  next();
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
    origin: env.clientUrl,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));
app.use(requestLogger);
app.use(rateLimiter);

// Static files - MUST be early
const frontendPath = path.join(__dirname, "../frontend/public");
app.use(express.static(frontendPath, { index: false }));

app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
app.use('/uploads/receipts', express.static(path.join(__dirname, 'uploads/receipts')));

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

app.use("/api/v1", routes);

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