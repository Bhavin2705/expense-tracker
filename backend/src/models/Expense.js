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
    merchant: {
      type: String,
      trim: true,
      maxlength: [120, 'Merchant cannot exceed 120 characters'],
      default: '',
    },
    transactionType: {
      type: String,
      enum: ['expense', 'refund', 'reimbursement'],
      default: 'expense',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    tax: {
      type: Number,
      min: [0, 'Tax cannot be negative'],
      default: 0,
    },
    tip: {
      type: Number,
      min: [0, 'Tip cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
      maxlength: [8, 'Currency code is too long'],
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
