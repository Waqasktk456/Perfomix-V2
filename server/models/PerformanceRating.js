const db = require('../db');

class PerformanceRating {
  // Get all ratings for an organization
  static async getByOrganization(organizationId) {
    const [ratings] = await db.query(
      `SELECT id, organization_id, name, min_score, max_score, color, bg_color, display_order
       FROM performance_ratings
       WHERE organization_id = ?
       ORDER BY display_order ASC, min_score DESC`,
      [organizationId]
    );
    return ratings;
  }

  // Get rating for a specific score
  static async getRatingForScore(score, organizationId) {
    const [ratings] = await db.query(
      `SELECT id, name, min_score, max_score, color, bg_color
       FROM performance_ratings
       WHERE organization_id = ? 
         AND ? >= min_score 
         AND ? <= max_score
       LIMIT 1`,
      [organizationId, score, score]
    );
    return ratings.length > 0 ? ratings[0] : null;
  }

  // Create a new rating
  static async create(organizationId, ratingData) {
    const { name, min_score, max_score, color, bg_color, display_order } = ratingData;
    
    // Validate no overlap
    const overlap = await this.checkOverlap(organizationId, min_score, max_score, null);
    if (overlap) {
      throw new Error('Rating range overlaps with existing rating');
    }

    const [result] = await db.query(
      `INSERT INTO performance_ratings 
       (organization_id, name, min_score, max_score, color, bg_color, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [organizationId, name, min_score, max_score, color, bg_color || color, display_order || 0]
    );
    return result.insertId;
  }

  // Update a rating
  static async update(id, organizationId, ratingData) {
    const { name, min_score, max_score, color, bg_color, display_order } = ratingData;
    
    // Validate no overlap (excluding current rating)
    const overlap = await this.checkOverlap(organizationId, min_score, max_score, id);
    if (overlap) {
      throw new Error('Rating range overlaps with existing rating');
    }

    await db.query(
      `UPDATE performance_ratings 
       SET name = ?, min_score = ?, max_score = ?, color = ?, bg_color = ?, display_order = ?, updated_at = NOW()
       WHERE id = ? AND organization_id = ?`,
      [name, min_score, max_score, color, bg_color || color, display_order || 0, id, organizationId]
    );
    return true;
  }

  // Delete a rating
  static async delete(id, organizationId) {
    await db.query(
      `DELETE FROM performance_ratings WHERE id = ? AND organization_id = ?`,
      [id, organizationId]
    );
    return true;
  }

  // Check for overlapping ranges
  static async checkOverlap(organizationId, min_score, max_score, excludeId = null) {
    let query = `
      SELECT id FROM performance_ratings
      WHERE organization_id = ?
        AND (
          (min_score <= ? AND max_score >= ?)
          OR (min_score <= ? AND max_score >= ?)
          OR (min_score >= ? AND max_score <= ?)
        )
    `;
    const params = [organizationId, min_score, min_score, max_score, max_score, min_score, max_score];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [results] = await db.query(query, params);
    return results.length > 0;
  }

  // Validate coverage (ensure 0-100 is covered)
  static async validateCoverage(organizationId) {
    const ratings = await this.getByOrganization(organizationId);
    
    console.log('=== validateCoverage Debug ===');
    console.log('Organization ID:', organizationId);
    console.log('Number of ratings:', ratings.length);
    
    if (ratings.length === 0) {
      console.log('No ratings found');
      return false;
    }
    
    // Sort by min_score
    ratings.sort((a, b) => parseFloat(a.min_score) - parseFloat(b.min_score));
    
    console.log('Sorted ratings:');
    ratings.forEach(r => {
      console.log(`  ${r.name}: ${r.min_score} - ${r.max_score}`);
    });
    
    // Check if starts at 0 (allow small tolerance)
    const firstMin = parseFloat(ratings[0].min_score);
    console.log('First min_score:', firstMin, 'Valid:', firstMin <= 0.01);
    if (firstMin > 0.01) {
      console.log('FAIL: Does not start at 0');
      return false;
    }
    
    // Check if ends at 100 (allow small tolerance)
    const lastMax = parseFloat(ratings[ratings.length - 1].max_score);
    console.log('Last max_score:', lastMax, 'Valid:', lastMax >= 99.99);
    if (lastMax < 99.99) {
      console.log('FAIL: Does not end at 100');
      return false;
    }
    
    // Check for gaps (allow gap of up to 0.1 for decimal precision)
    for (let i = 0; i < ratings.length - 1; i++) {
      const currentMax = parseFloat(ratings[i].max_score);
      const nextMin = parseFloat(ratings[i + 1].min_score);
      const gap = nextMin - currentMax;
      
      console.log(`Gap between ${ratings[i].name} and ${ratings[i+1].name}: ${gap}`);
      
      // Allow small gap (0.1) for decimal precision like 89.99 to 90.00
      if (gap > 0.1) {
        console.log(`FAIL: Gap too large (${gap})`);
        return false;
      }
    }
    
    console.log('PASS: Coverage is valid');
    return true;
  }

  // Create default ratings for a new organization
  static async createDefaultRatings(organizationId) {
    const defaultRatings = [
      { name: 'Excellent', min_score: 90.00, max_score: 100.00, color: '#4CAF50', bg_color: '#E8F5E9', display_order: 1 },
      { name: 'Very Good', min_score: 80.00, max_score: 89.99, color: '#8BC34A', bg_color: '#F1F8E9', display_order: 2 },
      { name: 'Good', min_score: 70.00, max_score: 79.99, color: '#FFC107', bg_color: '#FFF9C4', display_order: 3 },
      { name: 'Satisfactory', min_score: 60.00, max_score: 69.99, color: '#FF9800', bg_color: '#FFE0B2', display_order: 4 },
      { name: 'Needs Improvement', min_score: 0.00, max_score: 59.99, color: '#F44336', bg_color: '#FFEBEE', display_order: 5 }
    ];

    const insertedIds = [];
    for (const rating of defaultRatings) {
      try {
        const id = await this.create(organizationId, rating);
        insertedIds.push(id);
      } catch (error) {
        console.error(`Error creating default rating ${rating.name}:`, error);
      }
    }

    return insertedIds;
  }

  // Ensure organization has ratings (create defaults if missing)
  static async ensureDefaultRatings(organizationId) {
    const ratings = await this.getByOrganization(organizationId);
    
    if (ratings.length === 0) {
      console.log(`No ratings found for organization ${organizationId}, creating defaults...`);
      await this.createDefaultRatings(organizationId);
      return await this.getByOrganization(organizationId);
    }
    
    return ratings;
  }
}

module.exports = PerformanceRating;
