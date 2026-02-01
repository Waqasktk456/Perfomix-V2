// routes/lineManagerRoutes.js - Enhanced with new endpoints
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const lineManagerController = require('../controllers/lineManagerController');

// All routes protected
router.use(verifyToken);

// Get all teams assigned to current line manager with performance analytics
router.get('/assigned-teams', lineManagerController.getMyAssignedTeams);

// Get employees in a specific team assignment for evaluation
router.get('/team-employees/:assignmentId', lineManagerController.getTeamEmployeesForEvaluation);

// Get full evaluation form with all parameters for one employee
router.get('/evaluation-form/:evaluationId', lineManagerController.getEvaluationForm);

// Save draft evaluation (partial completion allowed)
router.post('/save-draft', lineManagerController.saveDraftEvaluation);

// Submit final evaluation (all parameters required)
router.post('/submit-evaluation', lineManagerController.submitEvaluation);

// NEW: Send reminder to team members with pending evaluations
router.post('/send-reminder', lineManagerController.sendReminder);

module.exports = router;