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
