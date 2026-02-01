const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protect all reporting routes
router.use(verifyToken);

// Admin Routes
router.get('/admin/org-summary', reportController.getAdminOrgSummary);
router.get('/admin/employee-list', reportController.getAdminEmployeeList);

// Line Manager Routes
router.get('/manager/team-report', reportController.getTeamReport);

// Individual Report (Accessible by Admin, Manager of the employee, or the employee themselves)
router.get('/individual/:evaluation_id', reportController.getIndividualReport);

module.exports = router;
