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
