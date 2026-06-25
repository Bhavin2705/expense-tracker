let app;

module.exports = async (req, res) => {
  try {
    // Load app once and reuse
    if (!app) {
      app = require("../server");
    }
    
    // Handle the request with Express app
    app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: error.message,
      path: req.url
    });
  }
};
