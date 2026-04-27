const PerformanceRating = require('../models/PerformanceRating');
const db = require('../db');

// Get all ratings for organization
exports.getRatings = async (req, res) => {
  try {
    // Get organization_id from token first, then fallback to DB lookup
    let organizationId = req.user.organizationId;

    if (!organizationId) {
      // Try users table first, then employees table
      const [userRows] = await db.query('SELECT organization_id FROM users WHERE id = ?', [req.user.id]);
      if (userRows.length > 0 && userRows[0].organization_id) {
        organizationId = userRows[0].organization_id;
      } else {
        const [empRows] = await db.query('SELECT organization_id FROM employees WHERE id = ?', [req.user.id]);
        if (empRows.length > 0) organizationId = empRows[0].organization_id;
      }
    }

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID not found.' });
    }

    const ratings = await PerformanceRating.ensureDefaultRatings(organizationId);
    res.json({ success: true, data: ratings });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ratings', error: error.message });
  }
};

// Get rating for a specific score
exports.getRatingForScore = async (req, res) => {
  try {
    const { score } = req.params;

    let organizationId = req.user.organizationId;
    if (!organizationId) {
      const [userRows] = await db.query('SELECT organization_id FROM users WHERE id = ?', [req.user.id]);
      if (userRows.length > 0 && userRows[0].organization_id) {
        organizationId = userRows[0].organization_id;
      } else {
        const [empRows] = await db.query('SELECT organization_id FROM employees WHERE id = ?', [req.user.id]);
        if (empRows.length > 0) organizationId = empRows[0].organization_id;
      }
    }

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID not found' });
    }

    await PerformanceRating.ensureDefaultRatings(organizationId);
    const rating = await PerformanceRating.getRatingForScore(parseFloat(score), organizationId);

    if (!rating) {
      return res.status(404).json({ success: false, message: 'No rating found for this score' });
    }

    res.json({ success: true, data: rating });
  } catch (error) {
    console.error('Error fetching rating for score:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rating' });
  }
};

// Create a new rating
exports.createRating = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { name, min_score, max_score, color, bg_color, display_order } = req.body;
    
    // Validation
    if (!name || min_score === undefined || max_score === undefined || !color) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    if (min_score < 0 || max_score > 100 || min_score >= max_score) {
      return res.status(400).json({ success: false, message: 'Invalid score range' });
    }
    
    const id = await PerformanceRating.create(organizationId, {
      name,
      min_score,
      max_score,
      color,
      bg_color,
      display_order
    });
    
    res.status(201).json({ success: true, message: 'Rating created successfully', id });
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create rating' });
  }
};

// Update a rating
exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const { name, min_score, max_score, color, bg_color, display_order } = req.body;
    
    // Validation
    if (!name || min_score === undefined || max_score === undefined || !color) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    if (min_score < 0 || max_score > 100 || min_score >= max_score) {
      return res.status(400).json({ success: false, message: 'Invalid score range' });
    }
    
    await PerformanceRating.update(id, organizationId, {
      name,
      min_score,
      max_score,
      color,
      bg_color,
      display_order
    });
    
    res.json({ success: true, message: 'Rating updated successfully' });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update rating' });
  }
};

// Delete a rating
exports.deleteRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    
    await PerformanceRating.delete(id, organizationId);
    
    res.json({ success: true, message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ success: false, message: 'Failed to delete rating' });
  }
};

// Validate coverage
exports.validateCoverage = async (req, res) => {
  try {
    // Always fetch fresh organization_id from database to avoid stale token issues
    const [[user]] = await db.query(
      'SELECT organization_id FROM users WHERE id = ?',
      [req.user.id]
    );
    
    const organizationId = user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID not found' });
    }
    
    const isValid = await PerformanceRating.validateCoverage(organizationId);
    
    res.json({ 
      success: true, 
      isValid,
      message: isValid ? 'Coverage is complete' : 'Coverage has gaps or does not span 0-100'
    });
  } catch (error) {
    console.error('Error validating coverage:', error);
    res.status(500).json({ success: false, message: 'Failed to validate coverage' });
  }
};

// Ensure default ratings exist for organization
exports.ensureDefaults = async (req, res) => {
  try {
    // Always fetch fresh organization_id from database to avoid stale token issues
    const [[user]] = await db.query(
      'SELECT organization_id FROM users WHERE id = ?',
      [req.user.id]
    );
    
    const organizationId = user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID not found' });
    }
    
    const ratings = await PerformanceRating.ensureDefaultRatings(organizationId);
    
    res.json({ 
      success: true, 
      message: 'Default ratings ensured',
      data: ratings
    });
  } catch (error) {
    console.error('Error ensuring default ratings:', error);
    res.status(500).json({ success: false, message: 'Failed to ensure default ratings' });
  }
};
