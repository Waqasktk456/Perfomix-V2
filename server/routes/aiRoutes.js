const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const aiController = require('../controllers/aiController');

router.use(verifyToken);

router.post('/generate-feedback', aiController.generateFeedback);

module.exports = router;
