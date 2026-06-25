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
