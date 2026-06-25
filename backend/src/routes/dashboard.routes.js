const express = require('express');
const router  = express.Router();
const { getDashboard } = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', getDashboard);

module.exports = router;
