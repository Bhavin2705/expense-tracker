const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async (uri) => {
  try {
    if (!uri || !uri.trim()) {
      logger.warn("MongoDB URI not configured. Running without database.");
      console.warn("MongoDB URI not configured. Database connection skipped.");
      return;
    }

    await mongoose.connect(uri);

    logger.info("MongoDB connected");
    console.log("MongoDB connected");
  } catch (error) {
    logger.error(error.message);
    console.error(error.message);
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info("MongoDB disconnected");
    }
  } catch (error) {
    logger.error(error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
