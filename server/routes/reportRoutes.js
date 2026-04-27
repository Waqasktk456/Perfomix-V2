const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protect all reporting routes
router.use(verifyToken);

// Admin Routes
router.get('/admin/org-summary', reportController.getAdminOrgSummary);
router.get('/admin/employee-list', reportController.getAdminEmployeeList);
router.get('/admin/org-trend', reportController.getOrgTrend);
router.get('/admin/team-insights', reportController.getTeamInsights);
router.get('/admin/benchmarking', reportController.getBenchmarking);

// Line Manager Routes
router.get('/manager/team-report', reportController.getTeamReport);
router.get('/team', reportController.getTeamReport); // alias used by admin view

// Individual Report (Accessible by Admin, Manager of the employee, or the employee themselves)
router.get('/individual/:evaluation_id', reportController.getIndividualReport);

// Department Report
router.get('/department', reportController.getDepartmentReport);

module.exports = router;
