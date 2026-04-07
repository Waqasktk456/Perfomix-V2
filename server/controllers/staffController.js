// controllers/staffController.js
const db = require('../config/db');

exports.getMyEvaluation = async (req, res) => {
  try {
    const employeeId = req.user.id; // from JWT token
    const { cycleId } = req.query; // Get cycle from query params

    console.log('Fetching staff evaluation for:', { employeeId, cycleId });

    // Build query based on whether cycleId is provided
    let evaluationQuery = `
      SELECT 
        ev.id AS evaluation_id,
        ev.overall_score,
        ev.rating_id,
        ev.rating_name,
        pr.color,
        pr.bg_color
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      LEFT JOIN performance_ratings pr ON ev.rating_id = pr.id
      WHERE ev.employee_id = ? AND ev.status = 'completed'
    `;
    
    const queryParams = [employeeId];
    
    if (cycleId) {
      evaluationQuery += ` AND ev.cycle_id = ?`;
      queryParams.push(cycleId);
    }
    
    evaluationQuery += ` ORDER BY ev.updated_at DESC LIMIT 1`;

    // Find the latest completed evaluation for this employee with rating info
    const [evaluations] = await db.query(evaluationQuery, queryParams);

    if (evaluations.length === 0) {
      return res.json({
        success: true,
        message: "No completed evaluation found",
        parameters: [],
        rating: null
      });
    }

    const evaluation = evaluations[0];
    const evaluationId = evaluation.evaluation_id;

    // Get parameters with scores, rating, and feedback
    const [rows] = await db.query(`
      SELECT 
        p.id AS parameter_id,
        p.parameter_name,
        pmx.weightage,
        COALESCE(ed.rating, NULL) AS rating,
        COALESCE(ed.score, NULL) AS score,
        COALESCE(ed.comments, '') AS feedback,
        COALESCE(ed.recommendation, '') AS recommendation
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      JOIN parameter_matrices pmx ON pmx.matrix_id = cta.matrix_id
      JOIN parameters p ON pmx.parameter_id = p.id
      LEFT JOIN evaluation_details ed ON ed.evaluation_id = ev.id AND ed.parameter_id = p.id
      WHERE ev.id = ?
      ORDER BY p.parameter_name
    `, [evaluationId]);

    console.log('Staff evaluation parameters:', JSON.stringify(rows, null, 2));

    res.json({
      success: true,
      evaluation_id: evaluationId,
      overall_score: evaluation.overall_score,
      rating: {
        id: evaluation.rating_id,
        name: evaluation.rating_name,
        color: evaluation.color,
        bg_color: evaluation.bg_color
      },
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

// Get all evaluations for performance trend
exports.getMyEvaluationTrend = async (req, res) => {
  try {
    const employeeId = req.user.id; // from JWT token

    console.log('Fetching evaluation trend for employee:', employeeId);

    // Get all completed evaluations with cycle info and rating
    const [evaluations] = await db.query(`
      SELECT 
        ev.id AS evaluation_id,
        ev.cycle_id,
        ev.overall_score,
        ev.rating_name,
        ec.cycle_name,
        ec.start_date,
        ec.end_date,
        ev.updated_at
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      JOIN evaluation_cycles ec ON ev.cycle_id = ec.id
      WHERE ev.employee_id = ? AND ev.status = 'completed'
      ORDER BY ec.start_date ASC, ev.updated_at ASC
    `, [employeeId]);

    console.log('Found evaluations for trend:', evaluations.length);

    res.json({
      success: true,
      trend: evaluations.map(ev => ({
        cycle_id: ev.cycle_id,
        cycle_name: ev.cycle_name,
        overall_score: ev.overall_score,
        rating_name: ev.rating_name,
        date: ev.updated_at
      }))
    });

  } catch (error) {
    console.error('Error fetching evaluation trend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load evaluation trend'
    });
  }
};

// Get performance benchmark comparison
exports.getPerformanceBenchmark = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({
        success: false,
        message: 'Cycle ID is required'
      });
    }

    console.log('Fetching benchmark for employee:', employeeId, 'cycle:', cycleId);

    // Get employee's score and team/department info
    const [employeeData] = await db.query(`
      SELECT 
        ev.overall_score,
        e.team_id,
        e.department_id,
        e.organization_id
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      JOIN employees e ON ev.employee_id = e.id
      WHERE ev.employee_id = ? AND ev.cycle_id = ? AND ev.status = 'completed'
      LIMIT 1
    `, [employeeId, cycleId]);

    if (employeeData.length === 0) {
      return res.json({
        success: true,
        message: 'No evaluation found for this cycle',
        employeeScore: null,
        teamAverage: null,
        departmentAverage: null,
        companyAverage: null,
        percentileRank: null
      });
    }

    const { overall_score, team_id, department_id, organization_id } = employeeData[0];

    // Calculate team average (only if team_id exists)
    let teamAverage = null;
    if (team_id) {
      const [teamAvg] = await db.query(`
        SELECT AVG(ev.overall_score) as avg_score
        FROM evaluations ev
        JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
        JOIN employees e ON ev.employee_id = e.id
        WHERE e.team_id = ? AND ev.cycle_id = ? AND ev.status = 'completed'
      `, [team_id, cycleId]);
      teamAverage = (teamAvg[0].avg_score !== null && teamAvg[0].avg_score !== undefined) 
        ? parseFloat(Number(teamAvg[0].avg_score).toFixed(1)) 
        : null;
    }

    // Calculate department average (only if department_id exists)
    let departmentAverage = null;
    if (department_id) {
      const [deptAvg] = await db.query(`
        SELECT AVG(ev.overall_score) as avg_score
        FROM evaluations ev
        JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
        JOIN employees e ON ev.employee_id = e.id
        WHERE e.department_id = ? AND ev.cycle_id = ? AND ev.status = 'completed'
      `, [department_id, cycleId]);
      departmentAverage = (deptAvg[0].avg_score !== null && deptAvg[0].avg_score !== undefined) 
        ? parseFloat(Number(deptAvg[0].avg_score).toFixed(1)) 
        : null;
    }

    // Calculate company average
    const [companyAvg] = await db.query(`
      SELECT AVG(ev.overall_score) as avg_score
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      JOIN employees e ON ev.employee_id = e.id
      WHERE e.organization_id = ? AND ev.cycle_id = ? AND ev.status = 'completed'
    `, [organization_id, cycleId]);

    const companyAverage = (companyAvg[0].avg_score !== null && companyAvg[0].avg_score !== undefined) 
      ? parseFloat(Number(companyAvg[0].avg_score).toFixed(1)) 
      : null;

    // Calculate percentile rank
    const [percentileData] = await db.query(`
      SELECT 
        COUNT(*) as total_employees,
        SUM(CASE WHEN ev.overall_score < ? THEN 1 ELSE 0 END) as employees_below
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      JOIN employees e ON ev.employee_id = e.id
      WHERE e.organization_id = ? AND ev.cycle_id = ? AND ev.status = 'completed'
    `, [overall_score, organization_id, cycleId]);

    const percentileRank = percentileData[0].total_employees > 0
      ? Math.round((percentileData[0].employees_below / percentileData[0].total_employees) * 100)
      : null;

    console.log('Benchmark calculated:', {
      employeeScore: overall_score,
      teamAverage,
      departmentAverage,
      companyAverage,
      percentileRank
    });

    res.json({
      success: true,
      employeeScore: parseFloat(Number(overall_score).toFixed(1)),
      teamAverage: teamAverage,
      departmentAverage: departmentAverage,
      companyAverage: companyAverage,
      percentileRank: percentileRank
    });

  } catch (error) {
    console.error('Error fetching performance benchmark:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to load benchmark data',
      error: error.message
    });
  }
};

// Get top 3 parameters for a team in a cycle
exports.getTeamTopParameters = async (req, res) => {
  try {
    const { teamId, cycleId } = req.query;

    if (!teamId || !cycleId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID and Cycle ID are required'
      });
    }

    console.log('Fetching top parameters for team:', teamId, 'cycle:', cycleId);

    // Get top 3 parameters by average score for the team in this cycle
    const [parameters] = await db.query(`
      SELECT 
        p.id AS parameter_id,
        p.parameter_name,
        AVG(ed.score) as avg_score,
        COUNT(ed.id) as evaluation_count
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      JOIN employees e ON ev.employee_id = e.id
      JOIN evaluation_details ed ON ed.evaluation_id = ev.id
      JOIN parameters p ON ed.parameter_id = p.id
      WHERE e.team_id = ? 
        AND ev.cycle_id = ? 
        AND ev.status = 'completed'
        AND ed.score IS NOT NULL
      GROUP BY p.id, p.parameter_name
      ORDER BY avg_score DESC
      LIMIT 3
    `, [teamId, cycleId]);

    console.log('Top parameters found:', parameters);

    res.json({
      success: true,
      topParameters: parameters.map(p => ({
        parameter_name: p.parameter_name,
        avg_score: Math.round(p.avg_score * 10) / 10,
        evaluation_count: p.evaluation_count
      }))
    });

  } catch (error) {
    console.error('Error fetching team top parameters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load team parameters',
      error: error.message
    });
  }
};

module.exports = exports;
