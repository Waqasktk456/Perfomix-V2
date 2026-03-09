const express = require('express');
const router = express.Router();
const performanceRatingController = require('../controllers/performanceRatingController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protect all routes
router.use(verifyToken);

// Get all ratings for organization
router.get('/', performanceRatingController.getRatings);

// Get rating for specific score
router.get('/score/:score', performanceRatingController.getRatingForScore);

// Validate coverage
router.get('/validate-coverage', performanceRatingController.validateCoverage);

// Ensure default ratings exist
router.post('/ensure-defaults', performanceRatingController.ensureDefaults);

// Create new rating
router.post('/', performanceRatingController.createRating);

// Update rating
router.put('/:id', performanceRatingController.updateRating);

// Delete rating
router.delete('/:id', performanceRatingController.deleteRating);

module.exports = router;
