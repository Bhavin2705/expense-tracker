const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  getUsers,
  updateUser,
  getAllExpenses,
  getStats
} = require("../controllers/admin.controller");

// All admin routes require authentication + admin role
router.use(auth);
router.use(authorize("admin"));

router.get("/stats", getStats);
router.get("/users", getUsers);
router.patch("/users/:id", updateUser);
router.get("/expenses", getAllExpenses);

module.exports = router;
