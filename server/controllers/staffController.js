// controllers/staffController.js
const db = require('../config/db');

exports.getMyEvaluation = async (req, res) => {
  try {
    const employeeId = req.user.id; // from JWT token

    // Find the latest completed evaluation for this employee
    const [evaluations] = await db.query(`
      SELECT ev.id AS evaluation_id
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      WHERE ev.employee_id = ? AND ev.status = 'completed'
      ORDER BY ev.updated_at DESC
      LIMIT 1
    `, [employeeId]);

    if (evaluations.length === 0) {
      return res.json({
        success: true,
        message: "No completed evaluation found",
        parameters: []
      });
    }

    const evaluationId = evaluations[0].evaluation_id;

    // Get parameters with scores and feedback
    const [rows] = await db.query(`
      SELECT 
        p.id AS parameter_id,
        p.parameter_name,
        pmx.weightage,
        COALESCE(ed.score, NULL) AS score,
        COALESCE(ed.comments, '') AS feedback
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      JOIN parameter_matrices pmx ON pmx.matrix_id = cta.matrix_id
      JOIN parameters p ON pmx.parameter_id = p.id
      LEFT JOIN evaluation_details ed ON ed.evaluation_id = ev.id AND ed.parameter_id = p.id
      WHERE ev.id = ?
      ORDER BY p.parameter_name
    `, [evaluationId]);

    res.json({
      success: true,
      evaluation_id: evaluationId,
      parameters: rows
    });

  } catch (error) {
    console.error('Error fetching staff evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load evaluation'
    });
  }
};

module.exports = exports;