const fs = require("fs");
const path = require("path");
const winston = require("winston");

const logDir = path.join(process.cwd(), "logs");

fs.mkdirSync(logDir, {
  recursive: true
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logDir, "application.log")
    })
  ]
});

module.exports = logger;
