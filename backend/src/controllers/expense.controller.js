const Expense = require('../models/Expense');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

function parseMoney(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseOptionalMoney(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string' && tags.trim()) {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

const logger = require('../utils/logger');

function deleteReceiptFile(receiptUrl) {
  if (!receiptUrl || !receiptUrl.startsWith('/uploads/receipts/')) return;
  const filePath = path.join(process.cwd(), receiptUrl.replace(/^\//, ''));
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') logger.error(`Failed to delete receipt: ${err.message}`);
  });
}

// GET /api/v1/expenses/summary (kept for future use)
const getExpenseSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo, transactionType, category } = req.query;
    const filter = { userId: req.user._id };

    if (transactionType) filter.transactionType = transactionType;
    if (category) filter.categoryId = category;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const summary = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          grossTotal: { $sum: '$amount' },
          netTotal: {
            $sum: {
              $cond: [
                { $in: ['$transactionType', ['refund', 'reimbursement']] },
                { $multiply: ['$amount', -1] },
                '$amount'
              ]
            }
          },
          taxTotal: { $sum: '$tax' },
          tipTotal: { $sum: '$tip' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const result = summary[0] || {
      grossTotal: 0, netTotal: 0, taxTotal: 0, tipTotal: 0, transactionCount: 0
    };

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
};

// POST /api/v1/expenses
const createExpense = async (req, res) => {
  try {
    const {
      title, description, merchant, amount, date, categoryId,
      paymentMethod, transactionType = 'expense', tax, tip,
      currency = 'INR', tags
    } = req.body;

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Title must be at least 2 characters' });
    }
    if (!amount || parseMoney(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }
    if (!date || isNaN(new Date(date).getTime())) {
      return res.status(400).json({ success: false, message: 'Valid date is required' });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const category = await Category.findOne({ _id: categoryId, createdBy: req.user._id });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const expense = await Expense.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      merchant: merchant ? merchant.trim() : '',
      transactionType,
      amount: parseMoney(amount),
      tax: parseOptionalMoney(tax),
      tip: parseOptionalMoney(tip),
      currency: String(currency).trim().toUpperCase(),
      date: new Date(date),
      categoryId,
      userId: req.user._id,
      receiptUrl: req.file ? `/uploads/receipts/${req.file.filename}` : null,
      paymentMethod: paymentMethod || null,
      tags: parseTags(tags),
    });

    await expense.populate('categoryId', 'name color icon');

    res.status(201).json({
      success: true,
      data: { expense }
    });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/expenses
const getExpenses = async (req, res) => {
  try {
    const { search, category, transactionType, dateFrom, dateTo, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { merchant: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) filter.categoryId = category;
    if (transactionType) filter.transactionType = transactionType;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total, totalsAgg] = await Promise.all([
      Expense.find(filter)
        .populate('categoryId', 'name color icon')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            grossTotal: { $sum: '$amount' },
            netTotal: {
              $sum: {
                $cond: [
                  { $in: ['$transactionType', ['refund', 'reimbursement']] },
                  { $multiply: ['$amount', -1] },
                  '$amount'
                ]
              }
            },
            taxTotal: { $sum: '$tax' },
            tipTotal: { $sum: '$tip' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        expenses,
        totals: totalsAgg[0] || { grossTotal: 0, netTotal: 0, taxTotal: 0, tipTotal: 0 },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('categoryId', 'name color icon');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: { expense } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Category validation
    if (req.body.categoryId) {
      const category = await Category.findOne({ _id: req.body.categoryId, createdBy: req.user._id });
      if (!category) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      expense.categoryId = req.body.categoryId;
    }

    // Update fields safely
    if (req.body.title) expense.title = req.body.title.trim();
    if (req.body.description !== undefined) expense.description = req.body.description?.trim() || '';
    if (req.body.merchant !== undefined) expense.merchant = req.body.merchant?.trim() || '';
    if (req.body.transactionType) expense.transactionType = req.body.transactionType;
    if (req.body.amount) expense.amount = parseMoney(req.body.amount);
    if (req.body.tax !== undefined) expense.tax = parseOptionalMoney(req.body.tax);
    if (req.body.tip !== undefined) expense.tip = parseOptionalMoney(req.body.tip);
    if (req.body.currency) expense.currency = String(req.body.currency).trim().toUpperCase();
    if (req.body.date) expense.date = new Date(req.body.date);
    if (req.body.paymentMethod !== undefined) expense.paymentMethod = req.body.paymentMethod || null;
    if (req.body.tags !== undefined) expense.tags = parseTags(req.body.tags);

    // Receipt handling
    if (req.body.removeReceipt === 'true' || req.body.removeReceipt === true) {
      deleteReceiptFile(expense.receiptUrl);
      expense.receiptUrl = null;
    }

    if (req.file) {
      deleteReceiptFile(expense.receiptUrl);
      expense.receiptUrl = `/uploads/receipts/${req.file.filename}`;
    }

    await expense.save();
    await expense.populate('categoryId', 'name color icon');

    res.json({ success: true, data: { expense } });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    deleteReceiptFile(expense.receiptUrl);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
};