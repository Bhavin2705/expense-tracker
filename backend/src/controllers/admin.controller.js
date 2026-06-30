const User = require("../models/User");
const Expense = require("../models/Expense");
const Category = require("../models/Category");
const logger = require("../utils/logger");

// GET /api/v1/admin/users — List all users
exports.getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    if (role && ["user", "admin"].includes(role)) {
      filter.role = role;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshTokens -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error(`Admin getUsers failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// PATCH /api/v1/admin/users/:id — Update user role or status
exports.updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const userId = req.params.id;

    // Prevent self-demotion
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot modify your own account via admin panel" });
    }

    const user = await User.findById(userId).select("-password -refreshTokens");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ success: false, message: "Role must be 'user' or 'admin'" });
      }
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();
    logger.info(`Admin updated user ${userId}: role=${user.role}, isActive=${user.isActive}`);

    return res.json({
      success: true,
      message: "User updated",
      data: { user: user.toSafeObject ? user.toSafeObject() : user }
    });
  } catch (error) {
    logger.error(`Admin updateUser failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

// GET /api/v1/admin/expenses — View all expenses (admin overview)
exports.getAllExpenses = async (req, res) => {
  try {
    const { search, userId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { merchant: { $regex: search, $options: "i" } }
      ];
    }

    if (userId) filter.userId = userId;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate("categoryId", "name color icon")
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Expense.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error(`Admin getAllExpenses failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch expenses" });
  }
};

// GET /api/v1/admin/stats — Admin dashboard overview
exports.getStats = async (req, res) => {
  try {
    const [userCount, expenseCount, categoryCount, recentUsers] = await Promise.all([
      User.countDocuments(),
      Expense.countDocuments(),
      Category.countDocuments(),
      User.find().select("name email role createdAt").sort({ createdAt: -1 }).limit(5)
    ]);

    return res.json({
      success: true,
      data: {
        userCount,
        expenseCount,
        categoryCount,
        recentUsers
      }
    });
  } catch (error) {
    logger.error(`Admin getStats failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};
