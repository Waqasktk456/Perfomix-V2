// routes/templateRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const templateController = require('../controllers/templateController');

// All routes require authentication
router.use(verifyToken);

// Get all templates
router.get('/', templateController.getAllTemplates);

// Search templates
router.get('/search', templateController.searchTemplates);

// Get specific template details
router.get('/:templateId', templateController.getTemplateById);

// Create matrix from template
router.post('/use', templateController.createMatrixFromTemplate);

// Create new template (admin only - you can add role check middleware)
router.post('/', templateController.createTemplate);

module.exports = router;