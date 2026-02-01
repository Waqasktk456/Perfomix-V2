// routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const staffController = require('../controllers/staffController');

router.use(verifyToken);

// Staff views their own completed evaluation
router.get('/my-evaluation', staffController.getMyEvaluation);

module.exports = router;