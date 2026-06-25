module.exports = (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: "ExpenseSplit API is running",
    timestamp: new Date().toISOString(),
    path: req.url
  });
};
