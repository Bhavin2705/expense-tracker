#!/usr/bin/env bash
set -euo pipefail

echo "=== ExpenseSplit Phase 4: Personal Expense Management ==="

# ─── Directories ─────────────────────────────────────────────────────────────
mkdir -p src/models
mkdir -p src/controllers
mkdir -p src/routes
mkdir -p src/middleware
mkdir -p src/helpers
mkdir -p uploads/receipts
mkdir -p public/js/services
mkdir -p public/js/pages
mkdir -p public/js/components

# ─── Install multer ──────────────────────────────────────────────────────────
if [ -f "package.json" ]; then
  if ! grep -q '"multer"' package.json 2>/dev/null; then
    echo "Installing multer..."
    npm install multer --save
  fi
else
  echo "WARNING: package.json not found. Skipping multer install."
fi

# ─── src/models/Category.js ──────────────────────────────────────────────────
cat > src/models/Category.js << 'ENDOFFILE'
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    icon: {
      type: String,
      default: 'other',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

categorySchema.index({ createdBy: 1 });

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
ENDOFFILE

echo "  src/models/Category.js"

# ─── src/models/Expense.js ───────────────────────────────────────────────────
cat > src/models/Expense.js << 'ENDOFFILE'
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'netbanking', 'other', null, ''],
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, categoryId: 1 });

module.exports = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
ENDOFFILE

echo "  src/models/Expense.js"

# ─── src/middleware/uploadReceipt.js ─────────────────────────────────────────
cat > src/middleware/uploadReceipt.js << 'ENDOFFILE'
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'receipt-' + Date.now() + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = function (_req, file, cb) {
  const allowed = /jpeg|jpg|png|gif|pdf/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png, gif) and PDFs are allowed'));
  }
};

const uploadReceipt = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = uploadReceipt;
ENDOFFILE

echo "  src/middleware/uploadReceipt.js"

# ─── src/helpers/seedCategories.js ───────────────────────────────────────────
cat > src/helpers/seedCategories.js << 'ENDOFFILE'
const Category = require('../models/Category');

const DEFAULT_CATEGORIES = [
  { name: 'Food',          color: '#ef4444', icon: 'food' },
  { name: 'Transport',     color: '#f97316', icon: 'transport' },
  { name: 'Shopping',      color: '#8b5cf6', icon: 'shopping' },
  { name: 'Bills',         color: '#06b6d4', icon: 'bills' },
  { name: 'Entertainment', color: '#ec4899', icon: 'entertainment' },
  { name: 'Health',        color: '#10b981', icon: 'health' },
  { name: 'Travel',        color: '#3b82f6', icon: 'travel' },
  { name: 'Education',     color: '#f59e0b', icon: 'education' },
  { name: 'Other',         color: '#6b7280', icon: 'other' },
];

/**
 * Seeds default categories for a user if they have none yet.
 * Call this after a new user is created in your auth controller:
 *
 *   const { seedDefaultCategories } = require('../helpers/seedCategories');
 *   await seedDefaultCategories(user._id);
 */
const seedDefaultCategories = async function (userId) {
  try {
    const existing = await Category.findOne({ createdBy: userId });
    if (existing) return;
    const docs = DEFAULT_CATEGORIES.map(function (c) {
      return Object.assign({}, c, { createdBy: userId, isDefault: true });
    });
    await Category.insertMany(docs);
  } catch (err) {
    console.error('seedDefaultCategories error:', err.message);
  }
};

module.exports = { seedDefaultCategories: seedDefaultCategories, DEFAULT_CATEGORIES: DEFAULT_CATEGORIES };
ENDOFFILE

echo "  src/helpers/seedCategories.js"

# ─── src/controllers/category.controller.js ──────────────────────────────────
cat > src/controllers/category.controller.js << 'ENDOFFILE'
const Category = require('../models/Category');
const Expense  = require('../models/Expense');
const { seedDefaultCategories } = require('../helpers/seedCategories');

// GET /api/v1/categories
const getCategories = async function (req, res) {
  try {
    const categories = await Category.find({ createdBy: req.user._id }).sort({ isDefault: -1, name: 1 });
    res.json({ success: true, data: { categories: categories } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/categories
const createCategory = async function (req, res) {
  try {
    const name  = req.body.name;
    const color = req.body.color;
    const icon  = req.body.icon;
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const category = await Category.create({
      name:      name.trim(),
      color:     color || '#6366f1',
      icon:      icon  || 'other',
      createdBy: req.user._id,
      isDefault: false,
    });
    res.status(201).json({ success: true, data: { category: category } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/categories/:id
const updateCategory = async function (req, res) {
  try {
    const category = await Category.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (req.body.name  !== undefined) category.name  = req.body.name.trim();
    if (req.body.color !== undefined) category.color = req.body.color;
    if (req.body.icon  !== undefined) category.icon  = req.body.icon;
    await category.save();
    res.json({ success: true, data: { category: category } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/categories/:id
const deleteCategory = async function (req, res) {
  try {
    const category = await Category.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (category.isDefault) {
      return res.status(403).json({ success: false, message: 'Default categories cannot be deleted' });
    }
    const expenseCount = await Expense.countDocuments({ categoryId: category._id, userId: req.user._id });
    if (expenseCount > 0) {
      return res.status(400).json({ success: false, message: 'Category is being used by expenses' });
    }
    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCategories:         getCategories,
  createCategory:        createCategory,
  updateCategory:        updateCategory,
  deleteCategory:        deleteCategory,
  seedDefaultCategories: seedDefaultCategories,
};
ENDOFFILE

echo "  src/controllers/category.controller.js"

# ─── src/controllers/expense.controller.js ───────────────────────────────────
cat > src/controllers/expense.controller.js << 'ENDOFFILE'
const Expense  = require('../models/Expense');
const Category = require('../models/Category');

// POST /api/v1/expenses
const createExpense = async function (req, res) {
  try {
    const title         = req.body.title;
    const description   = req.body.description;
    const amount        = req.body.amount;
    const date          = req.body.date;
    const categoryId    = req.body.categoryId;
    const paymentMethod = req.body.paymentMethod;
    const tags          = req.body.tags;

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Title must be at least 2 characters' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const category = await Category.findOne({ _id: categoryId, createdBy: req.user._id });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const parsedTags = Array.isArray(tags)
      ? tags
      : (typeof tags === 'string' && tags.trim().length > 0)
        ? tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
        : [];

    const expense = await Expense.create({
      title:         title.trim(),
      description:   description ? description.trim() : undefined,
      amount:        parseFloat(amount),
      date:          new Date(date),
      categoryId:    categoryId,
      userId:        req.user._id,
      receiptUrl:    req.file ? '/uploads/receipts/' + req.file.filename : null,
      paymentMethod: paymentMethod || null,
      tags:          parsedTags,
    });

    await expense.populate('categoryId', 'name color icon');
    res.status(201).json({ success: true, data: { expense: expense } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/expenses
const getExpenses = async function (req, res) {
  try {
    const search     = req.query.search;
    const category   = req.query.category;
    const dateFrom   = req.query.dateFrom;
    const dateTo     = req.query.dateTo;
    const month      = req.query.month;
    const year       = req.query.year;
    const sortBy     = req.query.sortBy    || 'date';
    const sortOrder  = req.query.sortOrder || 'desc';
    const page       = req.query.page      || 1;
    const limit      = req.query.limit     || 20;

    const filter = { userId: req.user._id };

    if (search && search.trim().length > 0) {
      filter.$or = [
        { title:       { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags:        { $in: [new RegExp(search.trim(), 'i')] } },
      ];
    }

    if (category && category.trim().length > 0) {
      filter.categoryId = category.trim();
    }

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    } else if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo)   filter.date.$lte = new Date(dateTo);
    }

    const allowedSortFields = ['date', 'amount', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const sortDir   = sortOrder === 'asc' ? 1 : -1;

    const pageNum  = Math.max(parseInt(page,  10) || 1,  1);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip     = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortField] = sortDir;

    const results = await Promise.all([
      Expense.find(filter)
        .populate('categoryId', 'name color icon')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Expense.countDocuments(filter),
    ]);

    const expenses = results[0];
    const total    = results[1];

    res.json({
      success: true,
      data: {
        expenses: expenses,
        pagination: {
          page:  pageNum,
          limit: limitNum,
          total: total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/expenses/summary
const getExpenseSummary = async function (req, res) {
  try {
    const userId       = req.user._id;
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const results = await Promise.all([
      Expense.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { userId: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $project: { total: 1, count: 1, name: '$category.name', color: '$category.color', icon: '$category.icon' } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalExpenses:        results[0][0] ? results[0][0].total : 0,
        currentMonthExpenses: results[1][0] ? results[1][0].total : 0,
        categoryBreakdown:    results[2],
        monthlyTrend:         results[3],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/expenses/:id
const getExpense = async function (req, res) {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('categoryId', 'name color icon');
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, data: { expense: expense } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/expenses/:id
const updateExpense = async function (req, res) {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const categoryId = req.body.categoryId;
    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, createdBy: req.user._id });
      if (!category) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      expense.categoryId = categoryId;
    }

    if (req.body.title       !== undefined) expense.title       = req.body.title.trim();
    if (req.body.description !== undefined) expense.description = req.body.description.trim();
    if (req.body.amount      !== undefined) expense.amount      = parseFloat(req.body.amount);
    if (req.body.date        !== undefined) expense.date        = new Date(req.body.date);
    if (req.body.paymentMethod !== undefined) expense.paymentMethod = req.body.paymentMethod || null;
    if (req.body.tags !== undefined) {
      const t = req.body.tags;
      expense.tags = Array.isArray(t)
        ? t
        : t.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (req.file) {
      expense.receiptUrl = '/uploads/receipts/' + req.file.filename;
    }

    await expense.save();
    await expense.populate('categoryId', 'name color icon');
    res.json({ success: true, data: { expense: expense } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/expenses/:id
const deleteExpense = async function (req, res) {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createExpense:      createExpense,
  getExpenses:        getExpenses,
  getExpense:         getExpense,
  updateExpense:      updateExpense,
  deleteExpense:      deleteExpense,
  getExpenseSummary:  getExpenseSummary,
};
ENDOFFILE

echo "  src/controllers/expense.controller.js"

# ─── src/controllers/dashboard.controller.js ─────────────────────────────────
cat > src/controllers/dashboard.controller.js << 'ENDOFFILE'
const Expense = require('../models/Expense');

// GET /api/v1/dashboard
const getDashboard = async function (req, res) {
  try {
    const userId       = req.user._id;
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const results = await Promise.all([
      Expense.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { userId: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.countDocuments({ userId: userId }),
      Expense.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $project: { total: 1, name: '$category.name', color: '$category.color', icon: '$category.icon' } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      Expense.find({ userId: userId })
        .populate('categoryId', 'name color icon')
        .sort({ date: -1 })
        .limit(5),
    ]);

    res.json({
      success: true,
      data: {
        totalExpenses:        results[0][0] ? results[0][0].total : 0,
        currentMonthExpenses: results[1][0] ? results[1][0].total : 0,
        expenseCount:         results[2],
        topCategories:        results[3],
        recentExpenses:       results[4],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboard: getDashboard };
ENDOFFILE

echo "  src/controllers/dashboard.controller.js"

# ─── src/routes/category.routes.js ───────────────────────────────────────────
cat > src/routes/category.routes.js << 'ENDOFFILE'
const express = require('express');
const router  = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/',    getCategories);
router.post('/',   createCategory);
router.patch('/:id',  updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
ENDOFFILE

echo "  src/routes/category.routes.js"

# ─── src/routes/expense.routes.js ────────────────────────────────────────────
cat > src/routes/expense.routes.js << 'ENDOFFILE'
const express = require('express');
const router  = express.Router();
const {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} = require('../controllers/expense.controller');
const auth          = require('../middleware/auth');
const uploadReceipt = require('../middleware/uploadReceipt');

router.use(auth);

router.get('/summary', getExpenseSummary);
router.get('/',        getExpenses);
router.post('/',       uploadReceipt.single('receipt'), createExpense);
router.get('/:id',     getExpense);
router.patch('/:id',   uploadReceipt.single('receipt'), updateExpense);
router.delete('/:id',  deleteExpense);

module.exports = router;
ENDOFFILE

echo "  src/routes/expense.routes.js"

# ─── src/routes/dashboard.routes.js ──────────────────────────────────────────
cat > src/routes/dashboard.routes.js << 'ENDOFFILE'
const express = require('express');
const router  = express.Router();
const { getDashboard } = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', getDashboard);

module.exports = router;
ENDOFFILE

echo "  src/routes/dashboard.routes.js"

# ─── Update src/routes/index.js ──────────────────────────────────────────────
# Inject phase-4 mounts BEFORE module.exports to ensure routes are reachable.
if [ -f "src/routes/index.js" ]; then
  if ! grep -q "category.routes" src/routes/index.js 2>/dev/null; then
    node - << 'NODESCRIPT'
const fs       = require('fs');
const filePath = 'src/routes/index.js';
let content    = fs.readFileSync(filePath, 'utf8');

const injection = [
  '',
  '// Phase 4 - Personal Expense Management',
  "const categoryRoutes  = require('./category.routes');",
  "const expenseRoutes   = require('./expense.routes');",
  "const dashboardRoutes = require('./dashboard.routes');",
  '',
  "router.use('/categories', categoryRoutes);",
  "router.use('/expenses',   expenseRoutes);",
  "router.use('/dashboard',  dashboardRoutes);",
  '',
].join('\n');

const exportToken = 'module.exports';
const idx = content.lastIndexOf(exportToken);
if (idx !== -1) {
  content = content.slice(0, idx) + injection + content.slice(idx);
} else {
  content = content + '\n' + injection;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('  src/routes/index.js updated (inserted before module.exports)');
NODESCRIPT
  else
    echo "  src/routes/index.js already has category routes - skipped"
  fi
else
  echo "WARNING: src/routes/index.js not found. Creating minimal version."
  cat > src/routes/index.js << 'ENDOFFILE'
const express = require('express');
const router  = express.Router();

// Phase 4 - Personal Expense Management
const categoryRoutes  = require('./category.routes');
const expenseRoutes   = require('./expense.routes');
const dashboardRoutes = require('./dashboard.routes');

router.use('/categories', categoryRoutes);
router.use('/expenses',   expenseRoutes);
router.use('/dashboard',  dashboardRoutes);

module.exports = router;
ENDOFFILE
fi

# ─── Serve uploads/receipts statically ───────────────────────────────────────
APP_ENTRY=""
for candidate in src/app.js app.js server.js src/server.js; do
  if [ -f "$candidate" ]; then
    APP_ENTRY="$candidate"
    break
  fi
done

if [ -n "$APP_ENTRY" ]; then
  if ! grep -q "uploads/receipts" "$APP_ENTRY" 2>/dev/null; then
    node - "$APP_ENTRY" << 'NODESCRIPT'
const fs       = require('fs');
const filePath = process.argv[2];
let content    = fs.readFileSync(filePath, 'utf8');

const isInSrc     = filePath.startsWith('src/');
const uploadsPath = isInSrc
  ? "require('path').join(__dirname, '..', 'uploads', 'receipts')"
  : "require('path').join(__dirname, 'uploads', 'receipts')";

const injection = [
  '',
  '// Phase 4 - serve uploaded receipts',
  "app.use('/uploads/receipts', require('express').static(" + uploadsPath + '));',
  '',
].join('\n');

const markers = ['router', 'routes', 'module.exports', 'app.listen'];
let insertIdx = -1;
for (let i = 0; i < markers.length; i++) {
  const idx = content.indexOf(markers[i]);
  if (idx !== -1) { insertIdx = idx; break; }
}

if (insertIdx !== -1) {
  content = content.slice(0, insertIdx) + injection + content.slice(insertIdx);
} else {
  content = content + injection;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('  ' + filePath + ' updated with static receipts route');
NODESCRIPT
  else
    echo "  $APP_ENTRY already serves uploads/receipts - skipped"
  fi
else
  echo ""
  echo "WARNING: Could not find app entry point (app.js / server.js)."
  echo "  Add this line manually after your middleware setup:"
  echo "  app.use('/uploads/receipts', require('express').static(require('path').join(__dirname, 'uploads', 'receipts')));"
  echo ""
fi

# ─── Seed integration notice ─────────────────────────────────────────────────
echo ""
echo "  ACTION REQUIRED - seed default categories on registration."
echo "  In your auth controller, after creating a new user, add:"
echo ""
echo "    const { seedDefaultCategories } = require('../helpers/seedCategories');"
echo "    await seedDefaultCategories(user._id);"
echo ""

# ─── public/js/services/categoryService.js ───────────────────────────────────
cat > public/js/services/categoryService.js << 'ENDOFFILE'
var categoryService = (function () {
  var BASE = '/api/v1/categories';

  function getToken() { return localStorage.getItem('token') || ''; }

  function request(url, options) {
    options = options || {};
    var headers = {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getToken(),
    };
    return fetch(url, Object.assign({}, options, { headers: headers }))
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.message || 'Request failed');
          return data;
        });
      });
  }

  return {
    getAll:  function ()          { return request(BASE); },
    create:  function (payload)   { return request(BASE,          { method: 'POST',  body: JSON.stringify(payload) }); },
    update:  function (id, payload){ return request(BASE + '/' + id, { method: 'PATCH', body: JSON.stringify(payload) }); },
    remove:  function (id)        { return request(BASE + '/' + id, { method: 'DELETE' }); },
  };
})();
ENDOFFILE

echo "  public/js/services/categoryService.js"

# ─── public/js/services/expenseService.js ────────────────────────────────────
cat > public/js/services/expenseService.js << 'ENDOFFILE'
var expenseService = (function () {
  var BASE = '/api/v1/expenses';

  function getToken() { return localStorage.getItem('token') || ''; }

  function request(url, options) {
    options = options || {};
    var isFormData = options.body instanceof FormData;
    var headers    = { 'Authorization': 'Bearer ' + getToken() };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return fetch(url, Object.assign({}, options, { headers: headers }))
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.message || 'Request failed');
          return data;
        });
      });
  }

  function buildQuery(params) {
    var q = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v !== undefined && v !== '' && v !== null) q.set(k, v);
    });
    var qs = q.toString();
    return qs ? '?' + qs : '';
  }

  return {
    getAll:     function (params) { return request(BASE + buildQuery(params || {})); },
    getSummary: function ()       { return request(BASE + '/summary'); },
    getOne:     function (id)     { return request(BASE + '/' + id); },
    create:     function (fd)     { return request(BASE,           { method: 'POST',  body: fd }); },
    update:     function (id, fd) { return request(BASE + '/' + id, { method: 'PATCH', body: fd }); },
    remove:     function (id)     { return request(BASE + '/' + id, { method: 'DELETE' }); },
  };
})();
ENDOFFILE

echo "  public/js/services/expenseService.js"

# ─── public/js/components/categoryModal.js ───────────────────────────────────
cat > public/js/components/categoryModal.js << 'ENDOFFILE'
var categoryModal = (function () {
  var editingId = null;

  var ICON_OPTIONS = [
    { value: 'food',          label: 'Food' },
    { value: 'transport',     label: 'Transport' },
    { value: 'shopping',      label: 'Shopping' },
    { value: 'bills',         label: 'Bills' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'health',        label: 'Health' },
    { value: 'travel',        label: 'Travel' },
    { value: 'education',     label: 'Education' },
    { value: 'other',         label: 'Other' },
  ];

  function buildModal() {
    var existing = document.getElementById('categoryModal');
    if (existing) existing.remove();

    var iconHtml = ICON_OPTIONS.map(function (o) {
      return '<span class="icon-option" data-icon="' + o.value
        + '" onclick="categoryModal.selectIcon(\'' + o.value + '\')">'
        + o.label + '</span>';
    }).join('');

    var el = document.createElement('div');
    el.id        = 'categoryModal';
    el.className = 'modal-overlay hidden';
    el.innerHTML =
      '<div class="modal-box">'
      + '<div class="modal-header">'
      + '<h3 id="categoryModalTitle">New Category</h3>'
      + '<button class="modal-close" onclick="categoryModal.close()">Close</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<div class="form-group"><label>Name <span class="required">*</span></label>'
      + '<input id="catName" type="text" placeholder="Category name" maxlength="50" /></div>'
      + '<div class="form-group"><label>Color</label>'
      + '<input id="catColor" type="color" value="#6366f1" /></div>'
      + '<div class="form-group"><label>Type</label>'
      + '<div class="icon-picker" id="iconPicker">' + iconHtml + '</div>'
      + '<input id="catIcon" type="hidden" value="other" /></div>'
      + '</div>'
      + '<div class="modal-footer">'
      + '<button class="btn btn-secondary" onclick="categoryModal.close()">Cancel</button>'
      + '<button class="btn btn-primary" onclick="categoryModal.save()">Save</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
  }

  function open(category) {
    category = category || null;
    buildModal();
    editingId = (category && category._id) ? category._id : null;
    document.getElementById('categoryModalTitle').textContent = editingId ? 'Edit Category' : 'New Category';
    document.getElementById('catName').value  = (category && category.name)  ? category.name  : '';
    document.getElementById('catColor').value = (category && category.color) ? category.color : '#6366f1';
    var selectedIcon = (category && category.icon) ? category.icon : 'other';
    document.getElementById('catIcon').value = selectedIcon;
    document.querySelectorAll('.icon-option').forEach(function (el) {
      el.classList.toggle('selected', el.dataset.icon === selectedIcon);
    });
    document.getElementById('categoryModal').classList.remove('hidden');
  }

  function close() {
    var el = document.getElementById('categoryModal');
    if (el) el.classList.add('hidden');
  }

  function selectIcon(icon) {
    document.getElementById('catIcon').value = icon;
    document.querySelectorAll('.icon-option').forEach(function (el) {
      el.classList.toggle('selected', el.dataset.icon === icon);
    });
  }

  function save() {
    var name = document.getElementById('catName').value.trim();
    if (!name) { alert('Please enter a category name'); return; }
    var payload = {
      name:  name,
      color: document.getElementById('catColor').value,
      icon:  document.getElementById('catIcon').value,
    };
    var promise = editingId
      ? categoryService.update(editingId, payload)
      : categoryService.create(payload);
    promise
      .then(function () {
        close();
        if (typeof loadCategories === 'function')        loadCategories();
        if (typeof refreshCategoryDropdown === 'function') refreshCategoryDropdown();
      })
      .catch(function (err) { alert(err.message); });
  }

  return { open: open, close: close, save: save, selectIcon: selectIcon };
})();
ENDOFFILE

echo "  public/js/components/categoryModal.js"

# ─── public/js/components/expenseModal.js ────────────────────────────────────
cat > public/js/components/expenseModal.js << 'ENDOFFILE'
var expenseModal = (function () {
  var editingId = null;

  function buildModal(categories) {
    categories = categories || [];
    var existing = document.getElementById('expenseModal');
    if (existing) existing.remove();

    var catOptions = categories.map(function (c) {
      return '<option value="' + c._id + '">' + c.name + '</option>';
    }).join('');

    var el = document.createElement('div');
    el.id        = 'expenseModal';
    el.className = 'modal-overlay hidden';
    el.innerHTML =
      '<div class="modal-box modal-lg">'
      + '<div class="modal-header">'
      + '<h3 id="expenseModalTitle">New Expense</h3>'
      + '<button class="modal-close" onclick="expenseModal.close()">Close</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<div class="form-row">'
      + '<div class="form-group flex-2"><label>Title <span class="required">*</span></label>'
      + '<input id="expTitle" type="text" placeholder="e.g. Lunch at cafe" minlength="2" maxlength="150" /></div>'
      + '<div class="form-group flex-1"><label>Amount <span class="required">*</span></label>'
      + '<input id="expAmount" type="number" min="0.01" step="0.01" placeholder="0.00" /></div>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group flex-1"><label>Date <span class="required">*</span></label>'
      + '<input id="expDate" type="date" /></div>'
      + '<div class="form-group flex-1"><label>Category <span class="required">*</span></label>'
      + '<select id="expCategory"><option value="">Select category</option>' + catOptions + '</select></div>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group flex-1"><label>Payment Method</label>'
      + '<select id="expPayment"><option value="">Select</option>'
      + '<option value="cash">Cash</option><option value="card">Card</option>'
      + '<option value="upi">UPI</option><option value="netbanking">Net Banking</option>'
      + '<option value="other">Other</option></select></div>'
      + '<div class="form-group flex-1"><label>Tags</label>'
      + '<input id="expTags" type="text" placeholder="comma separated" /></div>'
      + '</div>'
      + '<div class="form-group"><label>Description</label>'
      + '<textarea id="expDescription" rows="2" placeholder="Optional notes" maxlength="500"></textarea></div>'
      + '<div class="form-group"><label>Receipt</label>'
      + '<input id="expReceipt" type="file" accept="image/*,.pdf" />'
      + '<div id="expReceiptPreview" class="receipt-preview"></div></div>'
      + '</div>'
      + '<div class="modal-footer">'
      + '<button class="btn btn-secondary" onclick="expenseModal.close()">Cancel</button>'
      + '<button class="btn btn-primary" onclick="expenseModal.save()">Save Expense</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
  }

  function open(expense) {
    expense = expense || null;
    categoryService.getAll()
      .then(function (res) { return res.data.categories; })
      .catch(function () { return []; })
      .then(function (categories) {
        buildModal(categories);
        editingId = (expense && expense._id) ? expense._id : null;
        document.getElementById('expenseModalTitle').textContent = editingId ? 'Edit Expense' : 'New Expense';

        if (expense) {
          document.getElementById('expTitle').value       = expense.title       || '';
          document.getElementById('expAmount').value      = expense.amount      || '';
          document.getElementById('expDate').value        = expense.date        ? expense.date.substring(0, 10) : '';
          document.getElementById('expCategory').value   = (expense.categoryId && expense.categoryId._id)
            ? expense.categoryId._id : (expense.categoryId || '');
          document.getElementById('expPayment').value     = expense.paymentMethod || '';
          document.getElementById('expTags').value        = (expense.tags || []).join(', ');
          document.getElementById('expDescription').value = expense.description  || '';
          if (expense.receiptUrl) {
            document.getElementById('expReceiptPreview').innerHTML =
              '<a href="' + expense.receiptUrl + '" target="_blank" class="receipt-link">View current receipt</a>';
          }
        } else {
          document.getElementById('expDate').value = new Date().toISOString().substring(0, 10);
        }

        document.getElementById('expenseModal').classList.remove('hidden');
      });
  }

  function close() {
    var el = document.getElementById('expenseModal');
    if (el) el.classList.add('hidden');
  }

  function save() {
    var title      = document.getElementById('expTitle').value.trim();
    var amount     = document.getElementById('expAmount').value;
    var date       = document.getElementById('expDate').value;
    var categoryId = document.getElementById('expCategory').value;

    if (!title || title.length < 2)          { alert('Title must be at least 2 characters'); return; }
    if (!amount || parseFloat(amount) <= 0)  { alert('Amount must be greater than 0');       return; }
    if (!date)                               { alert('Date is required');                     return; }
    if (!categoryId)                         { alert('Please select a category');             return; }

    var fd = new FormData();
    fd.append('title',         title);
    fd.append('amount',        amount);
    fd.append('date',          date);
    fd.append('categoryId',    categoryId);
    fd.append('paymentMethod', document.getElementById('expPayment').value);
    fd.append('tags',          document.getElementById('expTags').value);
    fd.append('description',   document.getElementById('expDescription').value);
    var files = document.getElementById('expReceipt').files;
    if (files.length > 0) fd.append('receipt', files[0]);

    var promise = editingId
      ? expenseService.update(editingId, fd)
      : expenseService.create(fd);

    promise
      .then(function () {
        close();
        if (typeof loadExpenses          === 'function') loadExpenses();
        if (typeof loadDashboardExpenses === 'function') loadDashboardExpenses();
      })
      .catch(function (err) { alert(err.message); });
  }

  return { open: open, close: close, save: save };
})();
ENDOFFILE

echo "  public/js/components/expenseModal.js"

# ─── public/js/pages/expenses.js ─────────────────────────────────────────────
cat > public/js/pages/expenses.js << 'ENDOFFILE'
var currentPage = 1;

function loadExpenses(page) {
  currentPage = page || 1;

  var params = { page: currentPage, limit: 20 };

  var searchEl = document.getElementById('searchInput');
  var catEl    = document.getElementById('filterCategory');
  var fromEl   = document.getElementById('filterDateFrom');
  var toEl     = document.getElementById('filterDateTo');
  var sortEl   = document.getElementById('sortBy');
  var ordEl    = document.getElementById('sortOrder');

  if (searchEl && searchEl.value.trim()) params.search   = searchEl.value.trim();
  if (catEl    && catEl.value)           params.category = catEl.value;
  if (fromEl   && fromEl.value)          params.dateFrom = fromEl.value;
  if (toEl     && toEl.value)            params.dateTo   = toEl.value;
  params.sortBy    = sortEl ? (sortEl.value || 'date') : 'date';
  params.sortOrder = ordEl  ? (ordEl.value  || 'desc') : 'desc';

  expenseService.getAll(params)
    .then(function (res) {
      renderExpenses(res.data.expenses);
      renderPagination(res.data.pagination);
    })
    .catch(function (err) { console.error('loadExpenses error:', err); });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderExpenses(expenses) {
  var container = document.getElementById('expenseList');
  if (!container) return;
  if (!expenses || !expenses.length) {
    container.innerHTML =
      '<div class="empty-state"><p>No expenses found.</p>'
      + '<button class="btn btn-primary" onclick="expenseModal.open()">Add Expense</button></div>';
    return;
  }

  container.innerHTML = expenses.map(function (e) {
    var cat      = e.categoryId;
    var catName  = (cat && cat.name)  ? cat.name  : 'Uncategorised';
    var catColor = (cat && cat.color) ? cat.color : '#6366f1';
    var abbr     = catName.substring(0, 3).toUpperCase();
    var dateStr  = new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    var amt      = Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    var payHtml = e.paymentMethod
      ? '<span class="dot">·</span><span>' + escHtml(e.paymentMethod) + '</span>'
      : '';

    var tagsHtml = '';
    if (e.tags && e.tags.length) {
      tagsHtml = '<span class="dot">·</span>'
        + e.tags.map(function (t) { return '<span class="tag">' + escHtml(t) + '</span>'; }).join('');
    }

    var receiptHtml = e.receiptUrl
      ? '<a class="btn btn-secondary btn-sm" href="' + escHtml(e.receiptUrl) + '" target="_blank">Receipt</a>'
      : '';

    return '<div class="expense-item" data-id="' + e._id + '">'
      + '<div class="expense-cat-badge" style="background:' + catColor + '20;color:' + catColor + '">' + abbr + '</div>'
      + '<div class="expense-info">'
      + '<div class="expense-title">'  + escHtml(e.title) + '</div>'
      + '<div class="expense-meta"><span style="color:' + catColor + '">' + escHtml(catName) + '</span>' + payHtml + tagsHtml + '</div>'
      + '<div class="expense-date">'   + dateStr + '</div>'
      + '</div>'
      + '<div class="expense-amount">Rs. ' + amt + '</div>'
      + '<div class="expense-actions">'
      + '<button class="btn btn-secondary btn-sm" onclick="editExpense(\'' + e._id + '\')">Edit</button>'
      + '<button class="btn btn-danger btn-sm"    onclick="deleteExpenseItem(\'' + e._id + '\')">Delete</button>'
      + receiptHtml
      + '</div>'
      + '</div>';
  }).join('');
}

function renderPagination(pg) {
  var el = document.getElementById('pagination');
  if (!el) return;
  if (!pg || pg.pages <= 1) { el.innerHTML = ''; return; }
  var html = '';
  if (pg.page > 1) {
    html += '<button class="btn btn-secondary btn-sm" onclick="loadExpenses(' + (pg.page - 1) + ')">Prev</button>';
  }
  html += '<span class="page-info">Page ' + pg.page + ' of ' + pg.pages + ' (' + pg.total + ' total)</span>';
  if (pg.page < pg.pages) {
    html += '<button class="btn btn-secondary btn-sm" onclick="loadExpenses(' + (pg.page + 1) + ')">Next</button>';
  }
  el.innerHTML = html;
}

function editExpense(id) {
  expenseService.getOne(id)
    .then(function (res) { expenseModal.open(res.data.expense); })
    .catch(function (err) { alert(err.message); });
}

function deleteExpenseItem(id) {
  if (!confirm('Delete this expense?')) return;
  expenseService.remove(id)
    .then(function () { loadExpenses(currentPage); })
    .catch(function (err) { alert(err.message); });
}

function populateCategoryFilter() {
  var sel = document.getElementById('filterCategory');
  if (!sel) return;
  categoryService.getAll()
    .then(function (res) {
      res.data.categories.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value       = c._id;
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
    })
    .catch(function () {});
}

function debounce(fn, ms) {
  var t;
  return function () {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(null, args); }, ms);
  };
}

document.addEventListener('DOMContentLoaded', function () {
  populateCategoryFilter();
  loadExpenses(1);

  var searchEl = document.getElementById('searchInput');
  var catEl    = document.getElementById('filterCategory');
  var fromEl   = document.getElementById('filterDateFrom');
  var toEl     = document.getElementById('filterDateTo');
  var sortEl   = document.getElementById('sortBy');
  var ordEl    = document.getElementById('sortOrder');

  if (searchEl) searchEl.addEventListener('input',  debounce(function () { loadExpenses(1); }, 400));
  if (catEl)    catEl.addEventListener('change',    function () { loadExpenses(1); });
  if (fromEl)   fromEl.addEventListener('change',   function () { loadExpenses(1); });
  if (toEl)     toEl.addEventListener('change',     function () { loadExpenses(1); });
  if (sortEl)   sortEl.addEventListener('change',   function () { loadExpenses(1); });
  if (ordEl)    ordEl.addEventListener('change',    function () { loadExpenses(1); });
});
ENDOFFILE

echo "  public/js/pages/expenses.js"

# ─── public/expenses.html ─────────────────────────────────────────────────────
cat > public/expenses.html << 'ENDOFFILE'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Expenses - ExpenseSplit</title>
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    .expense-filters { display:flex; flex-wrap:wrap; gap:.75rem; align-items:flex-end; margin-bottom:1.25rem; }
    .expense-filters input,
    .expense-filters select { height:2.4rem; padding:0 .75rem; border:1px solid var(--border,#e2e8f0); border-radius:.5rem; background:var(--surface,#fff); color:var(--text,#1a202c); font-size:.875rem; }
    .expense-item { display:flex; align-items:center; gap:1rem; padding:1rem; background:var(--surface,#fff); border:1px solid var(--border,#e2e8f0); border-radius:.75rem; margin-bottom:.5rem; }
    .expense-cat-badge { min-width:2.75rem; height:2.75rem; border-radius:.5rem; display:flex; align-items:center; justify-content:center; font-size:.625rem; font-weight:700; letter-spacing:.05em; flex-shrink:0; padding:0 .25rem; }
    .expense-info { flex:1; min-width:0; }
    .expense-title { font-weight:600; font-size:.9375rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .expense-meta { font-size:.8125rem; color:var(--text-muted,#718096); display:flex; flex-wrap:wrap; gap:.25rem; margin-top:.125rem; }
    .expense-date { font-size:.8125rem; color:var(--text-muted,#718096); margin-top:.25rem; }
    .expense-amount { font-weight:700; font-size:1rem; white-space:nowrap; }
    .expense-actions { display:flex; gap:.375rem; flex-shrink:0; align-items:center; }
    .dot { color:var(--text-muted,#718096); }
    .tag { background:var(--bg,#f7fafc); border:1px solid var(--border,#e2e8f0); border-radius:999px; padding:.1rem .5rem; font-size:.75rem; }
    .receipt-link { font-size:.8125rem; color:var(--primary,#6366f1); text-decoration:none; }
    .receipt-preview { margin-top:.5rem; }
    .page-info { font-size:.875rem; color:var(--text-muted,#718096); padding:0 .5rem; }
    #pagination { display:flex; align-items:center; gap:.5rem; margin-top:1rem; }
    .empty-state { text-align:center; padding:3rem 1rem; color:var(--text-muted,#718096); }
    .icon-picker { display:flex; flex-wrap:wrap; gap:.375rem; margin-bottom:.5rem; }
    .icon-option { font-size:.8125rem; cursor:pointer; padding:.375rem .625rem; border-radius:.375rem; border:2px solid var(--border,#e2e8f0); background:var(--bg,#f7fafc); }
    .icon-option.selected { border-color:var(--primary,#6366f1); background:var(--primary-light,#ede9fe); color:var(--primary,#6366f1); font-weight:600; }
    .modal-lg { max-width:640px !important; }
    .form-row { display:flex; gap:1rem; }
    .flex-1 { flex:1; }
    .flex-2 { flex:2; }
    @media(max-width:600px) { .form-row { flex-direction:column; } }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="nav-brand">ExpenseSplit</div>
    <div class="nav-links">
      <a href="/dashboard.html">Dashboard</a>
      <a href="/expenses.html" class="active">Expenses</a>
      <a href="/groups.html">Groups</a>
      <a href="/categories.html">Categories</a>
    </div>
    <div class="nav-actions">
      <span id="navUser" class="nav-user"></span>
      <button class="btn btn-secondary btn-sm" onclick="auth.logout()">Logout</button>
    </div>
  </nav>

  <main class="main-content">
    <div class="page-header">
      <h1 class="page-title">My Expenses</h1>
      <button class="btn btn-primary" onclick="expenseModal.open()">Add Expense</button>
    </div>

    <div class="expense-filters">
      <input id="searchInput"    type="text"  placeholder="Search expenses..." />
      <select id="filterCategory"><option value="">All Categories</option></select>
      <input id="filterDateFrom" type="date"  title="From date" />
      <input id="filterDateTo"   type="date"  title="To date" />
      <select id="sortBy">
        <option value="date">Sort: Date</option>
        <option value="amount">Sort: Amount</option>
        <option value="createdAt">Sort: Created</option>
      </select>
      <select id="sortOrder">
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>

    <div id="expenseList"></div>
    <div id="pagination"></div>
  </main>

  <script src="/js/auth.js"></script>
  <script src="/js/services/categoryService.js"></script>
  <script src="/js/services/expenseService.js"></script>
  <script src="/js/components/categoryModal.js"></script>
  <script src="/js/components/expenseModal.js"></script>
  <script src="/js/pages/expenses.js"></script>
</body>
</html>
ENDOFFILE

echo "  public/expenses.html"

# ─── public/categories.html ───────────────────────────────────────────────────
cat > public/categories.html << 'ENDOFFILE'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Categories - ExpenseSplit</title>
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    .category-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1rem; margin-top:1rem; }
    .category-card { background:var(--surface,#fff); border:1px solid var(--border,#e2e8f0); border-radius:.75rem; padding:1.25rem; display:flex; flex-direction:column; gap:.75rem; }
    .category-card-header { display:flex; align-items:center; gap:.75rem; }
    .category-color-swatch { width:1rem; height:1rem; border-radius:50%; flex-shrink:0; }
    .category-name { font-weight:600; font-size:.9375rem; }
    .default-badge { font-size:.7rem; background:#e5e7eb; color:#374151; padding:.125rem .5rem; border-radius:999px; display:inline-block; margin-top:.25rem; }
    .category-actions { display:flex; gap:.5rem; }
    .empty-state { text-align:center; padding:3rem 1rem; color:var(--text-muted,#718096); }
    .icon-picker { display:flex; flex-wrap:wrap; gap:.375rem; margin-bottom:.5rem; }
    .icon-option { font-size:.8125rem; cursor:pointer; padding:.375rem .625rem; border-radius:.375rem; border:2px solid var(--border,#e2e8f0); background:var(--bg,#f7fafc); }
    .icon-option.selected { border-color:var(--primary,#6366f1); background:var(--primary-light,#ede9fe); color:var(--primary,#6366f1); font-weight:600; }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="nav-brand">ExpenseSplit</div>
    <div class="nav-links">
      <a href="/dashboard.html">Dashboard</a>
      <a href="/expenses.html">Expenses</a>
      <a href="/groups.html">Groups</a>
      <a href="/categories.html" class="active">Categories</a>
    </div>
    <div class="nav-actions">
      <span id="navUser" class="nav-user"></span>
      <button class="btn btn-secondary btn-sm" onclick="auth.logout()">Logout</button>
    </div>
  </nav>

  <main class="main-content">
    <div class="page-header">
      <h1 class="page-title">Categories</h1>
      <button class="btn btn-primary" onclick="categoryModal.open()">New Category</button>
    </div>
    <div class="category-grid" id="categoryGrid"></div>
  </main>

  <script src="/js/auth.js"></script>
  <script src="/js/services/categoryService.js"></script>
  <script src="/js/components/categoryModal.js"></script>
  <script>
    function loadCategories() {
      var grid = document.getElementById('categoryGrid');
      categoryService.getAll()
        .then(function (res) {
          var cats = res.data.categories;
          if (!cats || !cats.length) {
            grid.innerHTML = '<div class="empty-state">No categories yet.</div>';
            return;
          }
          grid.innerHTML = cats.map(function (c) {
            var defaultBadge = c.isDefault
              ? '<span class="default-badge">Default</span>'
              : '';
            var deleteBtn = !c.isDefault
              ? '<button class="btn btn-danger btn-sm" onclick="deleteCategory(\'' + c._id + '\')">Delete</button>'
              : '';
            return '<div class="category-card">'
              + '<div class="category-card-header">'
              + '<div class="category-color-swatch" style="background:' + c.color + '"></div>'
              + '<div><div class="category-name">' + c.name + '</div>' + defaultBadge + '</div>'
              + '</div>'
              + '<div class="category-actions">'
              + '<button class="btn btn-secondary btn-sm" onclick=\'categoryModal.open(' + JSON.stringify(c) + ')\'>Edit</button>'
              + deleteBtn
              + '</div>'
              + '</div>';
          }).join('');
        })
        .catch(function (err) {
          grid.innerHTML = '<p class="error">' + err.message + '</p>';
        });
    }

    function deleteCategory(id) {
      if (!confirm('Delete this category?')) return;
      categoryService.remove(id)
        .then(function () { loadCategories(); })
        .catch(function (err) { alert(err.message); });
    }

    document.addEventListener('DOMContentLoaded', loadCategories);
  </script>
</body>
</html>
ENDOFFILE

echo "  public/categories.html"

# ─── Patch dashboard.html ─────────────────────────────────────────────────────
if [ -f "public/dashboard.html" ] && ! grep -q "expenseCount" public/dashboard.html 2>/dev/null; then
  node - << 'NODESCRIPT'
const fs = require('fs');
let html = fs.readFileSync('public/dashboard.html', 'utf8');

const newCards =
  '    <!-- Phase 4 Expense Cards -->\n'
  + '    <div class="stat-card" id="totalExpCard" style="display:none">\n'
  + '      <div class="stat-label">Total Expenses</div>\n'
  + '      <div class="stat-value" id="totalExpValue">Rs. 0</div>\n'
  + '    </div>\n'
  + '    <div class="stat-card" id="monthExpCard" style="display:none">\n'
  + '      <div class="stat-label">This Month</div>\n'
  + '      <div class="stat-value" id="monthExpValue">Rs. 0</div>\n'
  + '    </div>\n'
  + '    <div class="stat-card" id="expCountCard" style="display:none">\n'
  + '      <div class="stat-label">Expense Count</div>\n'
  + '      <div class="stat-value" id="expenseCount">0</div>\n'
  + '    </div>\n';

const recentSection =
  '    <div style="margin-top:1.5rem">\n'
  + '      <h2 style="margin-bottom:.75rem;font-size:1rem;font-weight:600">Recent Expenses</h2>\n'
  + '      <div id="recentExpenses"></div>\n'
  + '    </div>\n';

const newScript =
  '<script>\n'
  + 'function loadDashboardExpenses() {\n'
  + '  var token = localStorage.getItem("token") || "";\n'
  + '  fetch("/api/v1/dashboard", { headers: { "Authorization": "Bearer " + token } })\n'
  + '    .then(function (res) { return res.json(); })\n'
  + '    .then(function (data) {\n'
  + '      if (!data.success) return;\n'
  + '      var d = data.data;\n'
  + '      function fmt(v) { return "Rs. " + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }\n'
  + '      var tvEl = document.getElementById("totalExpValue");\n'
  + '      var mvEl = document.getElementById("monthExpValue");\n'
  + '      var ecEl = document.getElementById("expenseCount");\n'
  + '      if (tvEl) tvEl.textContent = fmt(d.totalExpenses);\n'
  + '      if (mvEl) mvEl.textContent = fmt(d.currentMonthExpenses);\n'
  + '      if (ecEl) ecEl.textContent = d.expenseCount;\n'
  + '      ["totalExpCard","monthExpCard","expCountCard"].forEach(function (id) {\n'
  + '        var el = document.getElementById(id);\n'
  + '        if (el) el.style.display = "";\n'
  + '      });\n'
  + '      var recentEl = document.getElementById("recentExpenses");\n'
  + '      if (recentEl && d.recentExpenses && d.recentExpenses.length) {\n'
  + '        recentEl.innerHTML = d.recentExpenses.map(function (e) {\n'
  + '          var cat      = e.categoryId;\n'
  + '          var catName  = (cat && cat.name)  ? cat.name  : "Uncategorised";\n'
  + '          var catColor = (cat && cat.color) ? cat.color : "#6366f1";\n'
  + '          var amt = Number(e.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 });\n'
  + '          return \'<div style="display:flex;gap:.75rem;padding:.75rem;border:1px solid #e2e8f0;border-radius:.5rem;margin-bottom:.5rem;align-items:center">\'\n'
  + '            + \'<span style="color:\' + catColor + \';font-size:.8125rem;font-weight:600;min-width:90px">\' + catName + \'</span>\'\n'
  + '            + \'<span style="flex:1">\' + e.title + \'</span>\'\n'
  + '            + \'<strong>Rs. \' + amt + \'</strong>\'\n'
  + '            + \'</div>\';\n'
  + '        }).join("");\n'
  + '      }\n'
  + '    })\n'
  + '    .catch(function (e) { console.error(e); });\n'
  + '}\n'
  + 'document.addEventListener("DOMContentLoaded", loadDashboardExpenses);\n'
  + '<\/script>';

if (html.includes('</main>')) {
  html = html.replace('</main>', newCards + recentSection + '</main>');
}
if (html.includes('</body>')) {
  html = html.replace('</body>', newScript + '\n</body>');
}

fs.writeFileSync('public/dashboard.html', html);
console.log('  public/dashboard.html patched');
NODESCRIPT
elif [ -f "public/dashboard.html" ]; then
  echo "  public/dashboard.html already patched - skipped"
else
  echo "  WARNING: public/dashboard.html not found - skipping patch"
fi

# ─── Permissions ─────────────────────────────────────────────────────────────
chmod -R 755 uploads/receipts 2>/dev/null || true

echo ""
echo "==================================================="
echo "Phase 4 setup complete."
echo ""
echo "Files created:"
echo "  src/models/Category.js"
echo "  src/models/Expense.js"
echo "  src/middleware/uploadReceipt.js"
echo "  src/helpers/seedCategories.js"
echo "  src/controllers/category.controller.js"
echo "  src/controllers/expense.controller.js"
echo "  src/controllers/dashboard.controller.js"
echo "  src/routes/category.routes.js"
echo "  src/routes/expense.routes.js"
echo "  src/routes/dashboard.routes.js"
echo "  public/js/services/categoryService.js"
echo "  public/js/services/expenseService.js"
echo "  public/js/components/categoryModal.js"
echo "  public/js/components/expenseModal.js"
echo "  public/js/pages/expenses.js"
echo "  public/expenses.html"
echo "  public/categories.html"
echo "  uploads/receipts/"
echo ""
echo "Files updated:"
echo "  src/routes/index.js"
echo "  public/dashboard.html"
echo ""
echo "MANUAL STEP REQUIRED:"
echo "  In your auth controller, after creating a new user add:"
echo ""
echo "    const { seedDefaultCategories } = require('../helpers/seedCategories');"
echo "    await seedDefaultCategories(user._id);"
echo ""
echo "Restart your server and visit /expenses.html"
echo "==================================================="