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
  process.exit(1);
}

const db = require("./src/config/db");
const routes = require("./src/routes");
const requestLogger = require("./src/middleware/requestLogger");
const rateLimiter = require("./src/middleware/rateLimiter");
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");
const pageAuth = require("./src/middleware/pageAuth");

const app = express();

db.connectDB(env.mongoUri);

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
app.use(express.static(path.join(__dirname, "public"), { index: false }));

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
  // "/categories.html",
  "/profile.html"
];

app.get(privatePages, pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", path.basename(req.path)));
});

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`ExpenseSplit running on http://localhost:${env.port}`);
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