// routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const staffController = require('../controllers/staffController');

router.use(verifyToken);

// Staff views their own completed evaluation
router.get('/my-evaluation', staffController.getMyEvaluation);

// Staff views performance trend across all cycles
router.get('/my-evaluation-trend', staffController.getMyEvaluationTrend);

// Line manager views their own performance trend
router.get('/lm-evaluation-trend', staffController.getLMEvaluationTrend);

// Staff views performance benchmark comparison
router.get('/performance-benchmark', staffController.getPerformanceBenchmark);

// Get top 3 parameters for a team
router.get('/team-top-parameters', staffController.getTeamTopParameters);

module.exports = router;
