const express = require('express');
const router = express.Router();
const db = require('../db');

const { verifyToken } = require('../middlewares/authMiddleware');

// Protect all routes
router.use(verifyToken);

// Create a new evaluation
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    console.log('Received evaluation submission:', req.body);
    const {
      matrix_id,
      employee_id,
      evaluator_id,
      parameter_id,
      score,
      feedback,
      recommendation,
      overall_score, // for summary evaluations
      comments,      // for summary evaluations
      status,
      evaluation_type
    } = req.body;

    // Allow summary evaluation submissions (no parameter_id/score) for evaluator-type
    if (!matrix_id || !employee_id || !evaluator_id) {
      console.warn('Missing required fields:', { matrix_id, employee_id, evaluator_id });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        requiredFields: { matrix_id, employee_id, evaluator_id }
      });
    }

    // If parameter_id and score are present, treat as per-parameter evaluation (legacy)
    if (parameter_id && score !== undefined) {
      // Start a transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      console.log('Transaction started');

      try {
        // First check if this evaluation already exists
        const [existingEval] = await connection.query(
          `SELECT e.evaluation_id FROM evaluations e
           JOIN evaluation_details ed ON e.evaluation_id = ed.evaluation_id
           WHERE e.employee_id = ? AND e.matrix_id = ? AND ed.parameter_id = ?`,
          [employee_id, matrix_id, parameter_id]
        );
        console.log('Existing evaluation check result:', existingEval);

        if (existingEval.length > 0) {
          connection.release();
          console.warn('Duplicate evaluation detected for:', { employee_id, matrix_id, parameter_id });
          return res.status(400).json({
            success: false,
            message: 'An evaluation for this employee, matrix, and parameter already exists'
          });
        }

        // Insert into evaluations table
        const [evaluationResult] = await connection.query(
          `INSERT INTO evaluations (matrix_id, employee_id, evaluator_id, evaluation_date, overall_score, comments, status)
           VALUES (?, ?, ?, CURDATE(), ?, ?, 'submitted')`,
          [matrix_id, employee_id, evaluator_id, score, feedback]
        );
        console.log('Inserted into evaluations:', evaluationResult);

        // Insert into evaluation_details table
        await connection.query(
          `INSERT INTO evaluation_details (evaluation_id, parameter_id, score, comments)
           VALUES (?, ?, ?, ?)`,
          [evaluationResult.insertId, parameter_id, score, recommendation]
        );
        console.log('Inserted into evaluation_details for evaluation_id:', evaluationResult.insertId);

        // Update evaluation_status table
        await connection.query(
          `INSERT INTO evaluation_status (evaluation_id, employee_id, parameter_id, matrix_id, status)
           VALUES (?, ?, ?, ?, 'Completed')
           ON DUPLICATE KEY UPDATE 
             status = 'Completed',
             evaluation_id = VALUES(evaluation_id),
             updated_at = CURRENT_TIMESTAMP`,
          [evaluationResult.insertId, employee_id, parameter_id, matrix_id]
        );
        console.log('Updated evaluation_status');

        // Commit the transaction
        await connection.commit();
        connection.release();
        console.log('Transaction committed and connection released');

        res.status(201).json({
          success: true,
          message: 'Evaluation submitted successfully',
          data: { evaluation_id: evaluationResult.insertId }
        });
        return;
      } catch (error) {
        // Rollback in case of error
        await connection.rollback();
        connection.release();
        console.error('Error during transaction, rolled back:', error);
        throw error;
      }
    }

    // Otherwise, treat as summary evaluation (no parameter_id/score)
    // Insert only into evaluations table
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const [evaluationResult] = await connection.query(
        `INSERT INTO evaluations (matrix_id, employee_id, evaluator_id, evaluation_date, overall_score, comments, status)
         VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
        [matrix_id, employee_id, evaluator_id, overall_score, comments || feedback, status || 'submitted']
      );
      await connection.commit();
      connection.release();
      res.status(201).json({
        success: true,
        message: 'Summary evaluation submitted successfully',
        evaluation_id: evaluationResult.insertId
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error during summary evaluation transaction, rolled back:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit evaluation',
      error: error.message
    });
  }
});

// Get evaluation status for an employee and parameter
router.get('/status/:employeeId/:parameterId/:matrixId', async (req, res) => {
  try {
    const { employeeId, parameterId, matrixId } = req.params;
    console.log('Fetching evaluation status for:', { employeeId, parameterId, matrixId });

    const [rows] = await db.query(
      `SELECT status
       FROM evaluation_status
       WHERE employee_id = ? AND parameter_id = ? AND matrix_id = ?
       LIMIT 1`,
      [employeeId, parameterId, matrixId]
    );
    console.log('Status query result:', rows);

    res.json({
      success: true,
      status: rows.length > 0 ? rows[0].status : 'Pending'
    });
  } catch (error) {
    console.error('Error fetching evaluation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluation status',
      error: error.message
    });
  }
});

// Get all completed evaluations for a specific employee
router.get('/completed/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Find the latest completed evaluation for this employee
    const [evaluations] = await db.query(`
      SELECT ev.id AS evaluation_id
      FROM evaluations ev
      WHERE ev.employee_id = ? AND ev.status = 'completed'
      ORDER BY ev.updated_at DESC
      LIMIT 1
    `, [employeeId]);

    if (evaluations.length === 0) {
      return res.json({
        success: true,
        message: "No completed evaluation found",
        evaluations: []
      });
    }

    const evaluationId = evaluations[0].evaluation_id;

    // Get parameters with scores and feedback
    const [rows] = await db.query(`
      SELECT 
        p.id AS parameter_id,
        p.parameter_name AS parameter,
        pmx.weightage,
        COALESCE(ed.score, NULL) AS score,
        COALESCE(ed.comments, '') AS feedback,
        'completed' AS evaluation_status
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
      evaluations: rows
    });
  } catch (error) {
    console.error('Error fetching completed evaluations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch completed evaluations',
      error: error.message
    });
  }
});

// Get count of all pending evaluations (matching performance report logic)
router.get('/pending/count', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const [rows] = await db.query(
      `SELECT COUNT(*) as pendingCount
       FROM (
         SELECT 
           e.id AS Employee_id,
           pm.id AS matrix_id,
           (SELECT COUNT(*) FROM parameter_matrices pmx WHERE pmx.matrix_id = pm.id) AS total_params,
           (SELECT COUNT(*) 
            FROM evaluation_status es2 
            JOIN evaluations ev ON es2.evaluation_id = ev.id
            JOIN cycle_team_assignments cta2 ON ev.cycle_team_assignment_id = cta2.id
            WHERE es2.employee_id = e.id AND cta2.matrix_id = pm.id AND es2.status = 'Completed'
           ) AS completed_params
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN team_members tm ON e.id = tm.employee_id
         LEFT JOIN teams t ON tm.team_id = t.id
         LEFT JOIN cycle_team_assignments cta ON t.id = cta.team_id
         LEFT JOIN performance_matrices pm ON cta.matrix_id = pm.id
         WHERE e.role = 'Staff' AND e.organization_id = ? AND pm.id IS NOT NULL
         GROUP BY e.id, pm.id
       ) t
       WHERE t.total_params > 0 AND t.total_params != t.completed_params`,
      [organizationId]
    );
    res.json({ success: true, count: rows[0]?.pendingCount || 0 });
  } catch (error) {
    console.error('Error fetching pending count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending evaluations', error: error.message });
  }
});

// Get all employees' evaluation status (corrected logic)
router.get('/all-status', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { cycle_id } = req.query;

    let query = `
      SELECT 
        e.id AS Employee_id,
        e.first_name AS First_name,
        e.last_name AS Last_name,
        e.designation AS Designation,
        d.department_name AS Department_name,
        u.picture AS Profile_image,
        ev.id as id,
        pm.id AS matrix_id,
        (SELECT COUNT(*) FROM parameter_matrices pmx2 WHERE pmx2.matrix_id = pm.id) AS total_params,
        (SELECT COUNT(*) 
         FROM evaluation_status es2 
         JOIN evaluations ev2 ON es2.evaluation_id = ev2.id
         JOIN cycle_team_assignments cta2 ON ev2.cycle_team_assignment_id = cta2.id
         WHERE es2.employee_id = e.id AND ev2.status = 'completed' AND es2.status = 'completed'
         ${cycle_id ? 'AND cta2.cycle_id = ?' : ''}
        ) AS completed_params,
        CASE 
          WHEN (SELECT COUNT(*) FROM parameter_matrices pmx3 WHERE pmx3.matrix_id = pm.id) > 0
            AND (SELECT COUNT(*) FROM parameter_matrices pmx3 WHERE pmx3.matrix_id = pm.id) = 
                (SELECT COUNT(*) 
                 FROM evaluation_status es4 
                 JOIN evaluations ev4 ON es4.evaluation_id = ev4.id
                 JOIN cycle_team_assignments cta4 ON ev4.cycle_team_assignment_id = cta4.id
                 WHERE es4.employee_id = e.id AND ev4.status = 'completed' AND es4.status = 'completed'
                 ${cycle_id ? 'AND cta4.cycle_id = ?' : ''}
                )
          THEN 'Complete'
          ELSE 'Pending'
        END AS evaluation_status,
        CASE 
          WHEN ev.status = 'completed' THEN COALESCE(ev.overall_score, (
            SELECT SUM((ed.score * pmx.weightage) / 100)
            FROM evaluation_details ed
            JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id
            WHERE ed.evaluation_id = ev.id AND pmx.matrix_id = pm.id
          ))
          ELSE 0
        END AS overall_weighted_score
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN team_members tm ON e.id = tm.employee_id
      LEFT JOIN teams t ON tm.team_id = t.id
      JOIN cycle_team_assignments cta ON t.id = cta.team_id
      JOIN performance_matrices pm ON cta.matrix_id = pm.id
      LEFT JOIN evaluations ev ON e.id = ev.employee_id AND cta.id = ev.cycle_team_assignment_id
      WHERE e.role = 'Staff' AND e.organization_id = ?
      ${cycle_id ? 'AND cta.cycle_id = ?' : ''}
      GROUP BY e.id, pm.id, ev.id
      ORDER BY e.first_name ASC`;

    const params = cycle_id ? [cycle_id, cycle_id, organizationId, cycle_id] : [organizationId];
    const [rows] = await db.query(query, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching all employees evaluation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees evaluation status',
      error: error.message
    });
  }
});

// Add evaluation details (for each parameter)
router.post('/details', async (req, res) => {
  try {
    const { evaluation_id, parameter_id, score, comments } = req.body;
    if (!evaluation_id || !parameter_id || score === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const [result] = await db.query(
      `INSERT INTO evaluation_details (evaluation_id, parameter_id, score, comments)
       VALUES (?, ?, ?, ?)`,
      [evaluation_id, parameter_id, score, comments]
    );

    res.status(201).json({ success: true, message: 'Evaluation detail added', detail_id: result.insertId });
  } catch (error) {
    console.error('Error adding evaluation detail:', error);
    res.status(500).json({ success: false, message: 'Failed to add evaluation detail', error: error.message });
  }
});

module.exports = router; 