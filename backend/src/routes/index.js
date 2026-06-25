const express = require("express");

const authRoutes = require("./auth.routes");
const groupRoutes = require("./group.routes");
const participantRoutes = require("./participant.routes");
const profileRoutes = require("./profile.routes");
const categoryRoutes = require("./category.routes");
const expenseRoutes = require("./expense.routes");
const dashboardRoutes = require("./dashboard.routes");
const splitExpenseRoutes = require("./splitExpence.routes");

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({ success: true, message: "ExpenseSplit API is running", version: "1.0.0" });
});

router.use("/auth", authRoutes);
router.use("/groups", groupRoutes);
router.use(participantRoutes);
router.use("/profile", profileRoutes);
router.use("/categories", categoryRoutes);
router.use("/expenses", expenseRoutes);
router.use("/dashboard", dashboardRoutes);

// Split routes should be under /groups
router.use("/groups", splitExpenseRoutes);   // ← Changed this line

module.exports = router;    