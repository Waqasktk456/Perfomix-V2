// controllers/lineManagerController.js - Fixed Version
const db = require('../config/db');
const NotificationService = require('../services/notificationService');

exports.checkLineManagerCompletion = async (req, res) => {
  try {
    const { lineManagerId, cycleId } = req.params;

    if (!lineManagerId || !cycleId) {
      return res.status(400).json({
        success: false,
        message: "Line Manager ID and Cycle ID are required"
      });
    }

    // Get all evaluations assigned to this line manager in this cycle
    const [evaluations] = await db.query(`
      SELECT 
        COUNT(*) as total_evaluations,
        SUM(CASE WHEN ev.status = 'completed' THEN 1 ELSE 0 END) as completed_evaluations
      FROM cycle_team_assignments cta
      JOIN evaluations ev ON ev.cycle_team_assignment_id = cta.id
      WHERE cta.line_manager_id = ? 
        AND cta.cycle_id = ?
    `, [lineManagerId, cycleId]);

    const totalEvaluations = evaluations[0]?.total_evaluations || 0;
    const completedEvaluations = evaluations[0]?.completed_evaluations || 0;
    const pendingCount = totalEvaluations - completedEvaluations;
    const allCompleted = totalEvaluations > 0 && pendingCount === 0;

    res.json({
      success: true,
      allCompleted,
      pendingCount,
      totalEvaluations,
      completedEvaluations
    });

  } catch (error) {
    console.error('Error checking line manager completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check completion status',
      error: error.message
    });
  }
};

exports.getTeamsPerformance = async (req, res) => {
  try {
    const { lineManagerId, cycleId } = req.params;

    if (!lineManagerId || !cycleId) {
      return res.status(400).json({
        success: false,
        message: "Line Manager ID and Cycle ID are required"
      });
    }

    // Get all teams assigned to this line manager in this cycle with performance data
    const [teams] = await db.query(`
      SELECT 
        cta.id AS assignment_id,
        cta.team_id,
        cta.matrix_id,
        t.team_name,
        t.team_description,
        pm.matrix_name,
        d.Department_name AS department_name,
        ec.start_date,
        ec.end_date,
        (SELECT COUNT(*) 
         FROM team_members tm 
         WHERE tm.team_id = cta.team_id) AS employee_count,
        (SELECT COUNT(*) 
         FROM evaluations ev 
         WHERE ev.cycle_team_assignment_id = cta.id 
           AND ev.status = 'completed') AS completed_evaluations,
        (SELECT COUNT(*) 
         FROM evaluations ev 
         WHERE ev.cycle_team_assignment_id = cta.id) AS total_evaluations,
        (SELECT AVG(ev.overall_score)
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL) AS avg_performance_score,
        (SELECT CONCAT(e.first_name, ' ', e.last_name)
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score DESC
         LIMIT 1) AS top_performer_name,
        (SELECT e.designation
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score DESC
         LIMIT 1) AS top_performer_designation,
        (SELECT ev.overall_score
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score DESC
         LIMIT 1) AS top_performer_score,
        (SELECT CONCAT(e.first_name, ' ', e.last_name)
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score ASC
         LIMIT 1) AS low_performer_name,
        (SELECT e.designation
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score ASC
         LIMIT 1) AS low_performer_designation,
        (SELECT ev.overall_score
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score ASC
         LIMIT 1) AS low_performer_score,
        (SELECT MAX(ev.updated_at)
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id) AS last_activity
      FROM cycle_team_assignments cta
      JOIN teams t ON cta.team_id = t.id
      JOIN performance_matrices pm ON cta.matrix_id = pm.id
      JOIN departments d ON t.department_id = d.id
      JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
      WHERE cta.line_manager_id = ?
        AND cta.cycle_id = ?
      ORDER BY t.team_name
    `, [lineManagerId, cycleId]);

    const teamsData = teams.map(team => ({
      ...team,
      pending_evaluations: team.total_evaluations - team.completed_evaluations,
      avg_performance_score: team.avg_performance_score ? parseFloat(team.avg_performance_score) : null,
      top_performer: team.top_performer_name ? {
        name: team.top_performer_name,
        score: parseFloat(team.top_performer_score).toFixed(1),
        designation: team.top_performer_designation || 'N/A'
      } : null,
      low_performer: team.low_performer_name ? {
        name: team.low_performer_name,
        score: parseFloat(team.low_performer_score).toFixed(1),
        designation: team.low_performer_designation || 'N/A'
      } : null
    }));

    res.json({
      success: true,
      teams: teamsData
    });

  } catch (error) {
    console.error('Error fetching teams performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams performance',
      error: error.message
    });
  }
};

exports.getMyAssignedTeams = async (req, res) => {
  try {
    const userId = req.user.id;
    let lineManagerId = userId;

    // Resolve Employee ID from User ID if they are different
    // (User ID comes from `users` table, Line Manager ID in assignments is `employees.id`)
    const [employeeRows] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);

    if (employeeRows.length > 0) {
      lineManagerId = employeeRows[0].id;
    } else {
      // Fallback: IF the user is logged in but has no employee record linked,
      // it might be an admin testing or a legacy user.
      // However, for correct functionality, we need the Employee ID.
      // If no employee found, we can't find assignments by definition.

      // Check if maybe the user IS the employee (legacy behavior) by checking if ID exists in employees directly?
      // But safer to return empty if no link found.
      console.warn(`getMyAssignedTeams: No employee record found for user_id ${userId}`);
      // We will try using userId as lineManagerId just in case, but usually this is 0 results.
    }

    const [rows] = await db.query(`
      SELECT 
        cta.id AS assignment_id,
        cta.team_id,
        cta.cycle_id,
        t.team_name,
        t.team_description,
        pm.id AS matrix_id,
        pm.matrix_name,
        d.Department_name,
        ec.cycle_name,
        ec.start_date,
        ec.end_date,
        ec.status AS cycle_status,
        (SELECT COUNT(*) 
         FROM team_members tm 
         WHERE tm.team_id = cta.team_id) AS employee_count,
        (SELECT COUNT(*) 
         FROM evaluations ev 
         WHERE ev.cycle_team_assignment_id = cta.id 
           AND ev.status = 'completed') AS completed_evaluations,
        (SELECT COUNT(*) 
         FROM evaluations ev 
         WHERE ev.cycle_team_assignment_id = cta.id) AS total_evaluations,
        -- Real average performance score from completed evaluations
        (SELECT AVG(ev.overall_score)
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL) AS avg_performance_score,
        -- Top performer with designation
        (SELECT CONCAT(e.first_name, ' ', e.last_name)
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score DESC
         LIMIT 1) AS top_performer_name,
        (SELECT e.designation
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score DESC
         LIMIT 1) AS top_performer_designation,
        (SELECT ev.overall_score
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score DESC
         LIMIT 1) AS top_performer_score,
        -- Low performer with designation
        (SELECT CONCAT(e.first_name, ' ', e.last_name)
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score ASC
         LIMIT 1) AS low_performer_name,
        (SELECT e.designation
         FROM evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score ASC
         LIMIT 1) AS low_performer_designation,
        (SELECT ev.overall_score
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id
           AND ev.status = 'completed'
           AND ev.overall_score IS NOT NULL
         ORDER BY ev.overall_score ASC
         LIMIT 1) AS low_performer_score,
        -- Last activity
        (SELECT MAX(ev.updated_at)
         FROM evaluations ev
         WHERE ev.cycle_team_assignment_id = cta.id) AS last_activity,
        -- Reminder status
        COALESCE(
          (SELECT reminder_sent FROM team_reminders 
           WHERE assignment_id = cta.id 
           ORDER BY sent_at DESC LIMIT 1), 
          0
        ) AS reminder_sent,
        (SELECT sent_at FROM team_reminders 
         WHERE assignment_id = cta.id 
         ORDER BY sent_at DESC LIMIT 1) AS reminder_sent_at
      FROM cycle_team_assignments cta
      JOIN teams t ON cta.team_id = t.id
      JOIN performance_matrices pm ON cta.matrix_id = pm.id
      JOIN departments d ON t.department_id = d.id
      JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
      WHERE cta.line_manager_id = ?
      ORDER BY ec.created_at DESC
    `, [lineManagerId]);

    const teams = rows.map(row => ({
      assignment_id: row.assignment_id,
      team_id: row.team_id,
      cycle_id: row.cycle_id,
      team_name: row.team_name || 'Unnamed Team',
      team_description: row.team_description || '',
      matrix_id: row.matrix_id,
      matrix_name: row.matrix_name,
      department_name: row.Department_name,
      cycle_name: row.cycle_name,
      cycle_period: `${new Date(row.start_date).toLocaleDateString()} - ${new Date(row.end_date).toLocaleDateString()}`,
      start_date: row.start_date,
      end_date: row.end_date,
      cycle_status: row.cycle_status,
      employee_count: row.employee_count,
      completed_evaluations: row.completed_evaluations,
      pending_evaluations: row.total_evaluations - row.completed_evaluations,
      avg_performance_score: row.avg_performance_score ? parseFloat(row.avg_performance_score) : null,
      top_performer: row.top_performer_name ? {
        name: row.top_performer_name,
        score: parseFloat(row.top_performer_score).toFixed(1),
        designation: row.top_performer_designation || 'N/A'
      } : null,
      low_performer: row.low_performer_name ? {
        name: row.low_performer_name,
        score: parseFloat(row.low_performer_score).toFixed(1),
        designation: row.low_performer_designation || 'N/A'
      } : null,
      last_activity: row.last_activity,
      reminder_sent: Boolean(row.reminder_sent),
      reminder_sent_at: row.reminder_sent_at
    }));

    res.json({
      success: true,
      teams
    });

  } catch (error) {
    console.error('Error fetching assigned teams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load assigned teams'
    });
  }
};

exports.sendReminder = async (req, res) => {
  try {
    const { assignment_id } = req.body;
    const lineManagerId = req.user.id;

    if (!assignment_id) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required"
      });
    }

    // Verify this assignment belongs to this line manager
    const [assignmentCheck] = await db.query(`
      SELECT cta.id, t.team_name
      FROM cycle_team_assignments cta
      JOIN teams t ON cta.team_id = t.id
      WHERE cta.id = ? AND cta.line_manager_id = ?
    `, [assignment_id, lineManagerId]);

    if (assignmentCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Assignment not found or not assigned to you"
      });
    }

    // Get all employees with pending evaluations in this team
    const [employees] = await db.query(`
      SELECT DISTINCT
        e.id,
        e.email,
        CONCAT(e.First_name, ' ', e.Last_name) AS full_name
      FROM evaluations ev
      JOIN employees e ON ev.employee_id = e.id
      WHERE ev.cycle_team_assignment_id = ?
        AND ev.status != 'completed'
    `, [assignment_id]);

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No pending evaluations found for this team"
      });
    }

    // Log reminder in database
    await db.query(`
      INSERT INTO team_reminders (assignment_id, line_manager_id, reminder_sent, sent_at)
      VALUES (?, ?, 1, NOW())
    `, [assignment_id, lineManagerId]);

    // Here you would integrate with your email service
    // For now, we'll just simulate sending emails
    console.log(`Sending reminder to ${employees.length} employees for team: ${assignmentCheck[0].team_name}`);

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // employees.forEach(emp => {
    //   sendEmail({
    //     to: emp.email,
    //     subject: 'Reminder: Pending Performance Evaluation',
    //     body: `Dear ${emp.full_name}, you have a pending evaluation...`
    //   });
    // });

    res.json({
      success: true,
      message: `Reminder sent to ${employees.length} team member(s)`,
      employees_notified: employees.length
    });

  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
      error: error.message
    });
  }
};

exports.getEvaluationForm = async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const lineManagerId = req.user.id;

    if (!evaluationId) {
      return res.status(400).json({ success: false, message: "Evaluation ID required" });
    }

    const [evalInfo] = await db.query(`
      SELECT ev.status, ev.employee_id
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      WHERE ev.id = ? AND cta.line_manager_id = ?
    `, [evaluationId, lineManagerId]);

    if (evalInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found or not assigned to you"
      });
    }

    const evaluationStatus = evalInfo[0].status;
    const isEditable = evaluationStatus !== 'completed';

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
      WHERE ev.id = ? AND cta.line_manager_id = ?
      ORDER BY p.parameter_name
    `, [evaluationId, lineManagerId]);

    res.json({
      success: true,
      evaluation_status: evaluationStatus,
      is_editable: isEditable,
      parameters: rows
    });

  } catch (error) {
    console.error('Error loading evaluation form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load evaluation form',
      error: error.message
    });
  }
};

exports.saveDraftEvaluation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { evaluation_id, parameters } = req.body;
    const lineManagerId = req.user.id;

    if (!evaluation_id || !Array.isArray(parameters)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "evaluation_id and parameters array are required"
      });
    }

    const [evalCheck] = await connection.query(`
      SELECT ev.id, ev.employee_id
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      WHERE ev.id = ? AND cta.line_manager_id = ? AND ev.status != 'completed'
    `, [evaluation_id, lineManagerId]);

    if (evalCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Evaluation not found or already completed"
      });
    }

    const employee_id = evalCheck[0].employee_id;

    for (const param of parameters) {
      if (param.rating !== null && param.rating !== undefined && param.rating !== '') {
        const rating = Number(param.rating);

        if (rating < 1 || rating > 5) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Rating for parameter ${param.parameter_id} must be between 1 and 5`
          });
        }

        // Insert rating - score will be auto-calculated by database trigger
        await connection.query(`
          INSERT INTO evaluation_details (evaluation_id, parameter_id, rating, comments, recommendation)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            rating = VALUES(rating),
            comments = VALUES(comments),
            recommendation = VALUES(recommendation),
            updated_at = CURRENT_TIMESTAMP
        `, [evaluation_id, param.parameter_id, rating, param.comments || null, param.recommendation || null]);

        const [updateResult] = await connection.query(`
          UPDATE evaluation_status 
          SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
          WHERE evaluation_id = ? AND parameter_id = ?
        `, [evaluation_id, param.parameter_id]);

        if (updateResult.affectedRows === 0) {
          await connection.query(`
            INSERT INTO evaluation_status (evaluation_id, employee_id, parameter_id, status)
            VALUES (?, ?, ?, 'in_progress')
          `, [evaluation_id, employee_id, param.parameter_id]);
        }
      }
    }

    await connection.query(`
      UPDATE evaluations 
      SET status = 'draft', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [evaluation_id]);

    await connection.commit();

    res.json({
      success: true,
      message: "Draft saved successfully"
    });

  } catch (error) {
    await connection.rollback();
    console.error('Save draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.submitEvaluation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { evaluation_id, parameters } = req.body;
    const lineManagerId = req.user.id;

    if (!evaluation_id || !Array.isArray(parameters)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "evaluation_id and parameters array are required"
      });
    }

    const [evalCheck] = await connection.query(`
      SELECT ev.id, ev.employee_id, cta.matrix_id
      FROM evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      WHERE ev.id = ? AND cta.line_manager_id = ? AND ev.status != 'completed'
    `, [evaluation_id, lineManagerId]);

    if (evalCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Evaluation not found or already completed"
      });
    }

    const employee_id = evalCheck[0].employee_id;
    const matrix_id = evalCheck[0].matrix_id;

    const [paramCount] = await connection.query(`
      SELECT COUNT(*) as total
      FROM parameter_matrices
      WHERE matrix_id = ?
    `, [matrix_id]);

    const totalParams = paramCount[0].total;
    const filledParams = parameters.filter(p => p.rating !== null && p.rating !== undefined && p.rating !== '');

    if (filledParams.length !== totalParams) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `All ${totalParams} parameters must be rated. You have rated ${filledParams.length}.`
      });
    }

    for (const param of parameters) {
      const rating = Number(param.rating);

      if (rating < 1 || rating > 5) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Rating for parameter ${param.parameter_id} must be between 1 and 5`
        });
      }

      // Insert rating - score will be auto-calculated by database trigger
      await connection.query(`
        INSERT INTO evaluation_details (evaluation_id, parameter_id, rating, comments, recommendation)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          rating = VALUES(rating),
          comments = VALUES(comments),
          recommendation = VALUES(recommendation),
          updated_at = CURRENT_TIMESTAMP
      `, [evaluation_id, param.parameter_id, rating, param.comments || null, param.recommendation || null]);

      const [updateResult] = await connection.query(`
        UPDATE evaluation_status 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE evaluation_id = ? AND parameter_id = ?
      `, [evaluation_id, param.parameter_id]);

      if (updateResult.affectedRows === 0) {
        await connection.query(`
          INSERT INTO evaluation_status (evaluation_id, employee_id, parameter_id, status)
          VALUES (?, ?, ?, 'completed')
        `, [evaluation_id, employee_id, param.parameter_id]);
      }
    }

    // Calculate overall score before final submission (score is auto-calculated from rating)
    const [[scoreResult]] = await connection.query(`
      SELECT SUM((ed.score * pmx.weightage) / 100) as overall_score
      FROM evaluation_details ed
      JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id
      WHERE ed.evaluation_id = ? AND pmx.matrix_id = ?
    `, [evaluation_id, matrix_id]);

    const finalScore = scoreResult.overall_score || 0;

    // Get the performance rating based on the overall score
    const [[ratingResult]] = await connection.query(`
      SELECT id, name
      FROM performance_ratings
      WHERE min_score <= ? AND max_score >= ?
      ORDER BY min_score DESC
      LIMIT 1
    `, [finalScore, finalScore]);

    const ratingId = ratingResult ? ratingResult.id : null;
    const ratingName = ratingResult ? ratingResult.name : null;

    await connection.query(`
      UPDATE evaluations 
      SET status = 'completed', 
          overall_score = ?,
          rating_id = ?,
          rating_name = ?,
          submitted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [finalScore, ratingId, ratingName, evaluation_id]);

    await connection.commit();

    // Send evaluation submitted notification to the staff member
    try {
      const [[evalDetails]] = await connection.query(`
        SELECT 
          ev.employee_id,
          ev.overall_score,
          ev.organization_id,
          ev.cycle_team_assignment_id,
          e.first_name,
          e.last_name,
          ec.cycle_name,
          lm.first_name AS lm_first_name,
          lm.last_name AS lm_last_name
        FROM evaluations ev
        JOIN employees e ON ev.employee_id = e.id
        JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
        JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
        JOIN employees lm ON cta.line_manager_id = lm.id
        WHERE ev.id = ?
      `, [evaluation_id]);

      if (evalDetails) {
        await NotificationService.sendEvaluationSubmittedNotification({
          organization_id: evalDetails.organization_id,
          staff_id: evalDetails.employee_id,
          line_manager_id: lineManagerId,
          cycle_name: evalDetails.cycle_name,
          overall_score: finalScore.toFixed(2),
          feedback_summary: 'Your performance evaluation has been completed. Please review your results.',
          evaluation_id
        });

        // Check if all evaluations for this line manager in this cycle are completed
        const [[completionCheck]] = await connection.query(`
          SELECT 
            COUNT(*) as total_evaluations,
            SUM(CASE WHEN ev.status = 'completed' THEN 1 ELSE 0 END) as completed_evaluations,
            cta.cycle_id,
            ec.cycle_name,
            ec.organization_id
          FROM cycle_team_assignments cta
          JOIN evaluations ev ON ev.cycle_team_assignment_id = cta.id
          JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
          WHERE cta.line_manager_id = ? 
            AND cta.id = ?
          GROUP BY cta.cycle_id
        `, [lineManagerId, evalDetails.cycle_team_assignment_id]);

        // If all evaluations are completed, notify admins
        if (completionCheck && completionCheck.total_evaluations === completionCheck.completed_evaluations) {
          const [admins] = await connection.query(`
            SELECT id FROM employees 
            WHERE organization_id = ? 
              AND role = 'admin' 
              AND is_active = 1
          `, [completionCheck.organization_id]);

          if (admins.length > 0) {
            const admin_ids = admins.map(a => a.id);
            const line_manager_name = `${evalDetails.lm_first_name} ${evalDetails.lm_last_name}`;

            await NotificationService.sendManagerCompletionNotification({
              organization_id: completionCheck.organization_id,
              admin_ids,
              line_manager_id: lineManagerId,
              line_manager_name,
              evaluations_count: completionCheck.total_evaluations,
              cycle_name: completionCheck.cycle_name,
              cycle_id: completionCheck.cycle_id
            });
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to send evaluation notifications:', notifError);
      // Don't fail the submission if notifications fail
    }

    res.json({
      success: true,
      message: "Evaluation submitted successfully"
    });

  } catch (error) {
    await connection.rollback();
    console.error('Submit evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit evaluation',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.getTeamEmployeesForEvaluation = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required"
      });
    }

    // Build query based on user role
    let query = `
      SELECT 
        ev.id AS evaluation_id,
        ev.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.designation,
        e.Profile_image,
        ev.status AS evaluation_status,
        ev.overall_score,
        COALESCE((
          SELECT COUNT(*) 
          FROM evaluation_details ed 
          WHERE ed.evaluation_id = ev.id 
          AND ed.score IS NOT NULL
        ), 0) AS completed_params,
        COALESCE((
          SELECT COUNT(*) 
          FROM parameter_matrices pmx 
          WHERE pmx.matrix_id = cta.matrix_id
        ), 0) AS total_params
      FROM evaluations ev
      JOIN employees e ON ev.employee_id = e.id
      JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
      WHERE cta.id = ?
    `;

    const params = [assignmentId];

    // If user is a line manager (not admin), verify they own this assignment
    if (userRole === 'line-manager') {
      query += ` AND cta.line_manager_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY e.first_name, e.last_name`;

    const [rows] = await db.query(query, params);

    const employees = rows.map(row => ({
      evaluation_id: row.evaluation_id,
      employee_id: row.employee_id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email || "N/A",
      designation: row.designation || "N/A",
      profile_image: row.Profile_image || null,
      status: row.evaluation_status || 'pending',
      overall_score: row.overall_score || null,
      progress: row.total_params > 0
        ? Math.round((row.completed_params / row.total_params) * 100)
        : 0,
      completed_params: parseInt(row.completed_params),
      total_params: parseInt(row.total_params)
    }));

    res.json({
      success: true,
      employees
    });

  } catch (error) {
    console.error('Error in getTeamEmployeesForEvaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load team employees',
      error: error.message
    });
  }
};

exports.getMyOwnEvaluation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cycleId } = req.query; // Get cycle ID from query params

    // Get employee ID from user ID
    const [employeeRows] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    
    if (employeeRows.length === 0) {
      return res.json({
        success: true,
        message: "No employee record found",
        parameters: [],
        cycles: []
      });
    }

    const employeeId = employeeRows[0].id;

    // Get all cycles where this line manager has been evaluated
    const [cycles] = await db.query(`
      SELECT DISTINCT
        ec.id,
        ec.cycle_name,
        ec.start_date,
        ec.end_date,
        ec.status
      FROM line_manager_evaluations ev
      JOIN evaluation_cycles ec ON ev.cycle_id = ec.id
      WHERE ev.line_manager_id = ? AND ev.status = 'completed'
      ORDER BY ec.created_at DESC
    `, [employeeId]);

    if (cycles.length === 0) {
      return res.json({
        success: true,
        message: "No completed evaluation found",
        parameters: [],
        cycles: []
      });
    }

    // Use provided cycleId or default to the newest (first in the list)
    const selectedCycleId = cycleId || cycles[0].id;

    // Find the evaluation for the selected cycle
    const [evaluations] = await db.query(`
      SELECT ev.id AS evaluation_id
      FROM line_manager_evaluations ev
      WHERE ev.line_manager_id = ? AND ev.cycle_id = ? AND ev.status = 'completed'
      ORDER BY ev.updated_at DESC
      LIMIT 1
    `, [employeeId, selectedCycleId]);

    if (evaluations.length === 0) {
      return res.json({
        success: true,
        message: "No completed evaluation found for this cycle",
        parameters: [],
        cycles: cycles,
        selectedCycleId: selectedCycleId
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
      FROM line_manager_evaluations ev
      JOIN cycle_team_assignments cta ON ev.cycle_id = cta.cycle_id AND ev.line_manager_id = cta.line_manager_id
      JOIN parameter_matrices pmx ON pmx.matrix_id = cta.matrix_id
      JOIN parameters p ON pmx.parameter_id = p.id
      LEFT JOIN line_manager_evaluation_details ed ON ed.evaluation_id = ev.id AND ed.parameter_id = p.id
      WHERE ev.id = ?
      ORDER BY p.parameter_name
    `, [evaluationId]);

    res.json({
      success: true,
      evaluation_id: evaluationId,
      parameters: rows,
      cycles: cycles,
      selectedCycleId: selectedCycleId
    });

  } catch (error) {
    console.error('Error fetching line manager own evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load evaluation'
    });
  }
};

module.exports = {
  checkLineManagerCompletion: exports.checkLineManagerCompletion,
  getTeamsPerformance: exports.getTeamsPerformance,
  getMyAssignedTeams: exports.getMyAssignedTeams,
  getTeamEmployeesForEvaluation: exports.getTeamEmployeesForEvaluation,
  getEvaluationForm: exports.getEvaluationForm,
  saveDraftEvaluation: exports.saveDraftEvaluation,
  submitEvaluation: exports.submitEvaluation,
  sendReminder: exports.sendReminder,
  getMyOwnEvaluation: exports.getMyOwnEvaluation
};