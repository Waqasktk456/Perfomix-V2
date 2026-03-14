const express = require('express');
const router = express.Router();
const db = require('../db');

const { verifyToken } = require('../middlewares/authMiddleware');

// Protect all routes
router.use(verifyToken);

// Get line manager evaluation by employee and cycle
router.get('/line-manager/:employeeId/:cycleId', async (req, res) => {
  try {
    const { employeeId, cycleId } = req.params;
    const { organizationId } = req.user;

    console.log('=== Fetching line manager evaluation ===');
    console.log('Params:', { employeeId, cycleId, organizationId });

    // First, check if there's ANY evaluation for this employee in this cycle
    const [allEvals] = await db.query(
      `SELECT e.id, e.employee_id, e.cycle_id, e.cycle_team_assignment_id, e.overall_score, e.status
       FROM evaluations e
       WHERE e.employee_id = ? AND e.cycle_id = ? AND e.organization_id = ?`,
      [employeeId, cycleId, organizationId]
    );
    
    console.log('All evaluations for this employee in this cycle:', allEvals);

    // Fetch evaluation - line manager evaluations have NULL cycle_team_assignment_id
    const [evaluations] = await db.query(
      `SELECT e.id as evaluation_id, e.employee_id, e.cycle_id, 
              e.status, e.comments, e.overall_score, e.strengths, e.areas_for_improvement,
              ec.line_manager_matrix_id, ec.cycle_name
       FROM evaluations e
       JOIN evaluation_cycles ec ON e.cycle_id = ec.id
       WHERE e.employee_id = ? 
         AND e.cycle_id = ? 
         AND e.organization_id = ? 
         AND e.cycle_team_assignment_id IS NULL
       LIMIT 1`,
      [employeeId, cycleId, organizationId]
    );

    console.log('Line manager evaluation found:', evaluations);

    if (evaluations.length === 0) {
      console.log('No line manager evaluation found');
      return res.json({ success: true, evaluation: null, message: 'No line manager evaluation found' });
    }

    const evaluation = evaluations[0];
    const matrixId = evaluation.line_manager_matrix_id;

    console.log('Evaluation ID:', evaluation.evaluation_id);
    console.log('Matrix ID:', matrixId);
    console.log('Overall Score:', evaluation.overall_score);

    if (!matrixId) {
      console.log('WARNING: No line manager matrix assigned to this cycle');
    }

    // Fetch evaluation details with weightage and rating from the line manager matrix
    const [details] = await db.query(
      `SELECT ed.id, ed.parameter_id, ed.rating, ed.score, ed.comments, 
              p.parameter_name, 
              COALESCE(pm.weightage, 0) as weightage
       FROM evaluation_details ed
       JOIN parameters p ON ed.parameter_id = p.id
       LEFT JOIN parameter_matrices pm ON pm.parameter_id = p.id AND pm.matrix_id = ?
       WHERE ed.evaluation_id = ?
       ORDER BY p.parameter_name`,
      [matrixId, evaluation.evaluation_id]
    );

    console.log('Evaluation details count:', details.length);
    console.log('Sample detail:', details[0]);

    evaluation.details = details;
    evaluation.recommendation = evaluation.areas_for_improvement;

    console.log('=== Sending response ===');
    console.log('Overall score:', evaluation.overall_score);
    console.log('Details count:', evaluation.details.length);

    res.json({ success: true, evaluation });
  } catch (error) {
    console.error('Error fetching line manager evaluation:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch evaluation', error: error.message });
  }
});

// Get all evaluations done by a line manager in a specific cycle
router.get('/line-manager-performance/:lineManagerId/:cycleId', async (req, res) => {
  try {
    const { lineManagerId, cycleId } = req.params;
    const { organizationId } = req.user;

    // Fetch all evaluations done by this line manager in this cycle
    const [evaluations] = await db.query(
      `SELECT 
        ev.id,
        ev.employee_id,
        ev.status as evaluation_status,
        ev.overall_score,
        e.first_name,
        e.last_name,
        e.email,
        e.designation,
        d.Department_name as department_name,
        t.team_name
       FROM evaluations ev
       JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
       JOIN employees e ON ev.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN teams t ON cta.team_id = t.id
       WHERE cta.line_manager_id = ? 
         AND cta.cycle_id = ?
         AND ev.organization_id = ?
       ORDER BY e.first_name, e.last_name`,
      [lineManagerId, cycleId, organizationId]
    );

    res.json({ success: true, data: evaluations });
  } catch (error) {
    console.error('Error fetching line manager performance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance data' });
  }
});

// Update line manager evaluation
router.put('/line-manager/:employeeId/:cycleId', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { employeeId, cycleId } = req.params;
    const { organizationId } = req.user;
    const { overall_score, comments, recommendation, status, parameters } = req.body;

    console.log('Update LM evaluation:', { employeeId, cycleId, organizationId });

    // Find the evaluation
    const [evaluations] = await connection.query(
      `SELECT id 
       FROM evaluations
       WHERE employee_id = ? AND cycle_id = ? AND organization_id = ? AND cycle_team_assignment_id IS NULL
       LIMIT 1`,
      [employeeId, cycleId, organizationId]
    );

    console.log('Found evaluations:', evaluations);

    if (evaluations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Evaluation not found. Please make sure the cycle was activated after assigning the line manager matrix.' 
      });
    }

    const evaluationId = evaluations[0].id;

    console.log('Updating evaluation ID:', evaluationId);

    // Get the performance rating based on the overall score
    const [[ratingResult]] = await connection.query(
      `SELECT id, name
       FROM performance_ratings
       WHERE min_score <= ? AND max_score >= ?
       ORDER BY min_score DESC
       LIMIT 1`,
      [overall_score, overall_score]
    );

    const ratingId = ratingResult ? ratingResult.id : null;
    const ratingName = ratingResult ? ratingResult.name : null;

    // Update evaluation with overall score, comments, rating, and status
    await connection.query(
      `UPDATE evaluations 
       SET overall_score = ?, comments = ?, areas_for_improvement = ?, status = ?, rating_id = ?, rating_name = ?, updated_at = NOW()
       WHERE id = ?`,
      [overall_score, comments, recommendation, status, ratingId, ratingName, evaluationId]
    );

    // Update or insert evaluation details for each parameter with rating
    for (const param of parameters) {
      await connection.query(
        `INSERT INTO evaluation_details (evaluation_id, parameter_id, rating, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           rating = VALUES(rating), 
           updated_at = NOW()`,
        [evaluationId, param.parameter_id, param.rating]
      );
    }

    // Update evaluation status for all parameters
    await connection.query(
      `UPDATE evaluation_status 
       SET status = ?, updated_at = NOW()
       WHERE evaluation_id = ?`,
      [status, evaluationId]
    );

    await connection.commit();
    res.json({ success: true, message: 'Evaluation updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating line manager evaluation:', error);
    res.status(500).json({ success: false, message: 'Failed to update evaluation' });
  } finally {
    connection.release();
  }
});

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

    // Get the stored overall_score
    const [[overallScoreRow]] = await db.query(`
      SELECT overall_score FROM evaluations WHERE id = ?
    `, [evaluationId]);

    res.json({
      success: true,
      evaluation_id: evaluationId,
      overall_score: overallScoreRow?.overall_score || 0,
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

// Get evaluation by evaluation_id (for specific cycle)
router.get('/by-id/:evaluationId', async (req, res) => {
  try {
    const { evaluationId } = req.params;

    console.log('Fetching evaluation by ID:', evaluationId);

    // First check if this is a staff evaluation or line manager evaluation
    const [[evalCheck]] = await db.query(`
      SELECT ev.cycle_team_assignment_id, ev.cycle_id
      FROM evaluations ev
      WHERE ev.id = ?
    `, [evaluationId]);

    console.log('Evaluation check:', evalCheck);

    let rows;

    if (evalCheck && evalCheck.cycle_team_assignment_id) {
      // Staff evaluation - has cycle_team_assignment_id
      console.log('Fetching STAFF evaluation details');
      [rows] = await db.query(`
        SELECT 
          p.id AS parameter_id,
          p.parameter_name AS parameter,
          pmx.weightage,
          COALESCE(ed.rating, CASE 
            WHEN ed.score IS NOT NULL AND ed.score > 0 THEN ROUND(ed.score / 20)
            ELSE NULL 
          END) AS rating,
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
    } else if (evalCheck && evalCheck.cycle_id) {
      // Line manager evaluation - no cycle_team_assignment_id
      console.log('Fetching LINE MANAGER evaluation details');
      [rows] = await db.query(`
        SELECT 
          p.id AS parameter_id,
          p.parameter_name AS parameter,
          pmx.weightage,
          COALESCE(ed.rating, CASE 
            WHEN ed.score IS NOT NULL AND ed.score > 0 THEN ROUND(ed.score / 20)
            ELSE NULL 
          END) AS rating,
          COALESCE(ed.score, NULL) AS score,
          COALESCE(ed.comments, '') AS feedback,
          'completed' AS evaluation_status
        FROM evaluations ev
        JOIN evaluation_cycles ec ON ev.cycle_id = ec.id
        JOIN parameter_matrices pmx ON pmx.matrix_id = ec.line_manager_matrix_id
        JOIN parameters p ON pmx.parameter_id = p.id
        LEFT JOIN evaluation_details ed ON ed.evaluation_id = ev.id AND ed.parameter_id = p.id
        WHERE ev.id = ?
        ORDER BY p.parameter_name
      `, [evaluationId]);
    } else {
      console.log('No evaluation found');
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    console.log('Fetched rows:', rows.length);
    if (rows.length > 0) {
      console.log('Sample row with all fields:', JSON.stringify(rows[0], null, 2));
      console.log('All ratings:', rows.map(r => ({ param: r.parameter, rating: r.rating, score: r.score })));
    }

    // Get the stored overall_score and cycle_id
    const [[overallScoreRow]] = await db.query(`
      SELECT ev.overall_score, ev.cycle_id, ev.employee_id
      FROM evaluations ev
      WHERE ev.id = ?
    `, [evaluationId]);

    res.json({
      success: true,
      evaluation_id: evaluationId,
      overall_score: overallScoreRow?.overall_score || 0,
      cycle_id: overallScoreRow?.cycle_id,
      employee_id: overallScoreRow?.employee_id,
      evaluations: rows
    });
  } catch (error) {
    console.error('Error fetching evaluation by id:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluation',
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
    let { cycle_id } = req.query;

    // If no cycle_id provided, find the active one to ensure we only show relevant data
    if (!cycle_id) {
      const [activeCycle] = await db.query(
        "SELECT id FROM evaluation_cycles WHERE organization_id = ? AND status = 'active' LIMIT 1",
        [organizationId]
      );
      if (activeCycle.length > 0) {
        cycle_id = activeCycle[0].id;
      } else {
        // If no active cycle and no specific cycle requested, return empty
        return res.json({ success: true, data: [] });
      }
    }

    let query = `
      SELECT 
        e.id AS Employee_id,
        e.first_name AS First_name,
        e.last_name AS Last_name,
        e.designation AS Designation,
        d.department_name AS Department_name,
        u.picture AS Profile_image,
        t.id AS team_id,
        t.team_name AS Team_name,
        ev.id as id,
        ev.cycle_id,
        pm.id AS matrix_id,
        (SELECT COUNT(*) FROM parameter_matrices pmx2 WHERE pmx2.matrix_id = pm.id) AS total_params,
        (SELECT COUNT(*) 
         FROM evaluation_status es2 
         JOIN evaluations ev2 ON es2.evaluation_id = ev2.id
         JOIN cycle_team_assignments cta2 ON ev2.cycle_team_assignment_id = cta2.id
         WHERE es2.employee_id = e.id AND ev2.status = 'completed' AND es2.status = 'completed'
         AND cta2.cycle_id = ?
        ) AS completed_params,
        CASE 
          WHEN (SELECT COUNT(*) FROM parameter_matrices pmx3 WHERE pmx3.matrix_id = pm.id) > 0
            AND (SELECT COUNT(*) FROM parameter_matrices pmx3 WHERE pmx3.matrix_id = pm.id) = 
                (SELECT COUNT(*) 
                 FROM evaluation_status es4 
                 JOIN evaluations ev4 ON es4.evaluation_id = ev4.id
                 JOIN cycle_team_assignments cta4 ON ev4.cycle_team_assignment_id = cta4.id
                 WHERE es4.employee_id = e.id AND ev4.status = 'completed' AND es4.status = 'completed'
                 AND cta4.cycle_id = ?
                )
          THEN 'Complete'
          ELSE 'Pending'
        END AS evaluation_status,
        CASE 
          WHEN ev.status = 'completed' THEN ev.overall_score
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
      AND cta.cycle_id = ?
      GROUP BY e.id, pm.id, ev.id
      ORDER BY e.first_name ASC`;

    // Params: cycle_id for subquery 1, cycle_id for subquery 2, orgId, cycle_id for main query
    const params = [cycle_id, cycle_id, organizationId, cycle_id];
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

// Admin: Get performance benchmark for any employee
router.get('/benchmark/:employeeId/:cycleId', async (req, res) => {
  try {
    const { employeeId, cycleId } = req.params;
    const { organizationId } = req.user;

    console.log('Admin fetching benchmark for employee:', employeeId, 'cycle:', cycleId);

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
      WHERE ev.employee_id = ? AND ev.cycle_id = ? AND ev.status = 'completed' AND e.organization_id = ?
      LIMIT 1
    `, [employeeId, cycleId, organizationId]);

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

    const { overall_score, team_id, department_id } = employeeData[0];

    // Calculate team average
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

    // Calculate department average
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
    `, [organizationId, cycleId]);

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
    `, [overall_score, organizationId, cycleId]);

    const percentileRank = percentileData[0].total_employees > 0
      ? Math.round((percentileData[0].employees_below / percentileData[0].total_employees) * 100)
      : null;

    res.json({
      success: true,
      employeeScore: parseFloat(Number(overall_score).toFixed(1)),
      teamAverage: teamAverage,
      departmentAverage: departmentAverage,
      companyAverage: companyAverage,
      percentileRank: percentileRank
    });

  } catch (error) {
    console.error('Error fetching benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load benchmark data'
    });
  }
});

// Admin: Get performance trend for any employee
router.get('/trend/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { organizationId } = req.user;

    console.log('Admin fetching trend for employee:', employeeId);

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
      JOIN employees e ON ev.employee_id = e.id
      WHERE ev.employee_id = ? AND ev.status = 'completed' AND e.organization_id = ?
      ORDER BY ec.start_date ASC, ev.updated_at ASC
    `, [employeeId, organizationId]);

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
    console.error('Error fetching trend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load trend data'
    });
  }
});

module.exports = router; 