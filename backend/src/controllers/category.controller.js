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
