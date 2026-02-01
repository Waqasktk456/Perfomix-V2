// routes/evaluationCycleRoutes.js
const express = require('express');
const router = express.Router();
const cycleController = require('../controllers/evaluationCycleController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protect ALL routes below with verifyToken (only once!)
router.use(verifyToken);

// === Cycle Routes ===
router.post('/cycles', cycleController.createCycle);
router.get('/cycles', cycleController.getAllCycles);
router.put('/cycles/:id', cycleController.updateCycle);
router.post('/cycles/:id/activate', cycleController.activateCycle);

// === Assignment Routes ===
router.post('/cycle-assignments', cycleController.assignTeam);
router.get('/cycle-assignments/:cycleId', cycleController.getAssignments);

module.exports = router;