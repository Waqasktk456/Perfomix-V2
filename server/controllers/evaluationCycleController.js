// controllers/evaluationCycleController.js
const EvaluationCycle = require('../models/EvaluationCycle');
const CycleTeamAssignment = require('../models/CycleTeamAssignment');
const Evaluation = require('../models/Evaluation');
const db = require('../config/db');
const NotificationService = require('../services/notificationService');

exports.createCycle = async (req, res) => {
  const { name: cycle_name, start_date, end_date } = req.body;
  const { organizationId: organization_id, id: user_id } = req.user || {};

  if (!organization_id || !user_id) {
    return res.status(401).json({ error: 'Unauthorized: Missing user data' });
  }

  if (!cycle_name || !start_date || !end_date) {
    return res.status(400).json({ error: 'Cycle name, start date, and end date are required' });
  }

  try {
    const cycleId = await EvaluationCycle.create({
      cycle_name: cycle_name.trim(),
      start_date,
      end_date,
      organization_id,
      created_by: user_id
    });

    res.status(201).json({
      message: 'Cycle created as draft',
      cycle_id: cycleId
    });
  } catch (error) {
    console.error('Cycle creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create cycle' });
  }
};

exports.getAllCycles = async (req, res) => {
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized: Missing organization' });
  }

  try {
    let cycles = await EvaluationCycle.findAllByOrg(organization_id);

    for (let cycle of cycles) {
      cycle.assigned_teams_count = await EvaluationCycle.getAssignmentCount(cycle.id);
    }

    res.json(cycles);
  } catch (error) {
    console.error('Fetch cycles error:', error);
    res.status(500).json({ error: 'Failed to fetch cycles' });
  }
};

exports.getCycleById = async (req, res) => {
  const { id } = req.params;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized: Missing organization' });
  }

  try {
    const cycle = await EvaluationCycle.findByIdAndOrg(id, organization_id);
    
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    cycle.assigned_teams_count = await EvaluationCycle.getAssignmentCount(cycle.id);

    res.json(cycle);
  } catch (error) {
    console.error('Fetch cycle error:', error);
    res.status(500).json({ error: 'Failed to fetch cycle' });
  }
};

exports.getLineManagersByCycle = async (req, res) => {
  const { id } = req.params;
  const { organizationId: organization_id } = req.user || {};

  console.log('=== getLineManagersByCycle ===');
  console.log('Cycle ID:', id);
  console.log('Organization ID:', organization_id);

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized: Missing organization' });
  }

  try {
    // Get distinct line managers who have been assigned teams in this cycle
    const [lineManagers] = await db.query(`
      SELECT DISTINCT
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.designation,
        e.is_active,
        e.role,
        d.Department_name as department_name,
        COUNT(DISTINCT cta.id) as assigned_teams_count,
        COUNT(ev.id) as total_evaluations,
        SUM(CASE WHEN ev.status = 'completed' THEN 1 ELSE 0 END) as completed_evaluations,
        (COUNT(ev.id) - COALESCE(SUM(CASE WHEN ev.status = 'completed' THEN 1 ELSE 0 END), 0)) as pending_count,
        CASE 
          WHEN COUNT(ev.id) > 0 AND COUNT(ev.id) = SUM(CASE WHEN ev.status = 'completed' THEN 1 ELSE 0 END)
          THEN 'Completed'
          ELSE 'Pending'
        END as evaluation_status,
        (SELECT CASE 
          WHEN COUNT(*) > 0 THEN 'Evaluated'
          ELSE 'Not Evaluated'
        END
        FROM evaluations lm_ev
        WHERE lm_ev.employee_id = e.id
          AND lm_ev.cycle_id = ?
          AND lm_ev.cycle_team_assignment_id IS NULL
          AND lm_ev.status = 'completed'
        ) as admin_evaluation_status
      FROM cycle_team_assignments cta
      JOIN employees e ON cta.line_manager_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN evaluations ev ON ev.cycle_team_assignment_id = cta.id
      WHERE cta.cycle_id = ?
        AND e.organization_id = ?
      GROUP BY e.id, e.first_name, e.last_name, e.email, e.designation, e.is_active, e.role, d.Department_name
      ORDER BY e.first_name, e.last_name
    `, [id, id, organization_id]);

    console.log('Found line managers:', lineManagers.length);
    if (lineManagers.length > 0) {
      console.log('Sample line manager data:', {
        name: `${lineManagers[0].first_name} ${lineManagers[0].last_name}`,
        total_evaluations: lineManagers[0].total_evaluations,
        completed_evaluations: lineManagers[0].completed_evaluations,
        pending_count: lineManagers[0].pending_count,
        evaluation_status: lineManagers[0].evaluation_status,
        admin_evaluation_status: lineManagers[0].admin_evaluation_status
      });
    }

    res.json(lineManagers);
  } catch (error) {
    console.error('Fetch line managers by cycle error:', error);
    res.status(500).json({ error: 'Failed to fetch line managers' });
  }
};

exports.updateLineManagerMatrix = async (req, res) => {
  const { id } = req.params;
  const { line_manager_matrix_id } = req.body;
  const { organizationId: organization_id } = req.user || {};

  console.log('updateLineManagerMatrix called:', { id, line_manager_matrix_id, organization_id });

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!line_manager_matrix_id) {
    return res.status(400).json({ error: 'Line manager matrix ID is required' });
  }

  try {
    const cycle = await EvaluationCycle.findByIdAndOrg(id, organization_id);
    console.log('Found cycle:', cycle);
    
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
    if (cycle.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft cycles can be edited' });
    }

    console.log('Executing UPDATE query...');
    const [result] = await db.execute(
      'UPDATE evaluation_cycles SET line_manager_matrix_id = ? WHERE id = ?',
      [line_manager_matrix_id, id]
    );
    
    console.log('Update result:', result);

    res.json({ message: 'Line manager matrix updated successfully' });
  } catch (error) {
    console.error('Update line manager matrix error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Update failed' });
  }
};

exports.updateCycle = async (req, res) => {
  const { id } = req.params;
  const { name: cycle_name, start_date, end_date } = req.body;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!cycle_name || !start_date || !end_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const cycle = await EvaluationCycle.findByIdAndOrg(id, organization_id);
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
    if (cycle.status !== 'draft') return res.status(400).json({ error: 'Only draft cycles can be edited' });

    await EvaluationCycle.update(id, {
      cycle_name: cycle_name.trim(),
      start_date,
      end_date
    });

    res.json({ message: 'Cycle updated successfully' });
  } catch (error) {
    console.error('Update cycle error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
};

exports.activateCycle = async (req, res) => {
  const { id: cycle_id } = req.params;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const cycle = await EvaluationCycle.findByIdAndOrg(cycle_id, organization_id);
    if (!cycle) {
      throw new Error('Cycle not found');
    }
    if (cycle.status !== 'draft') {
      throw new Error('Only draft cycles can be activated');
    }

    const assignments = await EvaluationCycle.getTeamAssignmentsForCycle(cycle_id);
    if (assignments.length === 0) {
      throw new Error('Cannot activate: No teams assigned to this cycle');
    }

    const teamIds = assignments.map(a => a.team_id);
    const conflicting = await EvaluationCycle.checkTeamInActiveCycle(teamIds, cycle_id);
    if (conflicting.length > 0) {
      throw new Error(`Teams already in another active cycle: ${conflicting.join(', ')}`);
    }

    // Delete any existing evaluations for this cycle (in case of reactivation)
    console.log('Deleting existing evaluations for cycle:', cycle_id);
    
    try {
      // Delete in correct order to avoid foreign key issues
      // Use subquery instead of IN with array
      await connection.execute(
        `DELETE FROM evaluation_details 
         WHERE evaluation_id IN (SELECT id FROM (SELECT id FROM evaluations WHERE cycle_id = ?) AS temp)`,
        [cycle_id]
      );
      
      await connection.execute(
        `DELETE FROM evaluation_status 
         WHERE evaluation_id IN (SELECT id FROM (SELECT id FROM evaluations WHERE cycle_id = ?) AS temp)`,
        [cycle_id]
      );
      
      await connection.execute(
        `DELETE FROM evaluations WHERE cycle_id = ?`,
        [cycle_id]
      );
      
      console.log('Deleted existing evaluations successfully');
    } catch (deleteError) {
      console.error('Error deleting existing evaluations:', deleteError);
      // Continue anyway - might be first activation
    }

    let totalEmployees = 0;
    let totalDetails = 0;

    for (const assignment of assignments) {
      const result = await EvaluationCycle.createEvaluationsForAssignment(connection, {
        assignment_id: assignment.assignment_id,
        cycle_id,
        team_id: assignment.team_id,
        matrix_id: assignment.matrix_id,
        evaluator_id: assignment.evaluator_id,
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        organization_id
      });

      totalEmployees += result.employeesCreated;
      totalDetails += result.detailsCreated;
    }

    await connection.execute(
      `UPDATE evaluation_cycles SET status = 'active' WHERE id = ?`,
      [cycle_id]
    );

    // Create evaluations for line managers if line_manager_matrix_id is set
    if (cycle.line_manager_matrix_id) {
      // Get unique line managers who have been assigned teams in this cycle
      const [lineManagers] = await connection.execute(
        `SELECT DISTINCT e.id, e.first_name, e.last_name, e.email 
         FROM employees e
         INNER JOIN cycle_team_assignments cta ON e.id = cta.line_manager_id
         WHERE cta.cycle_id = ? AND e.organization_id = ? AND e.role = 'line-manager' AND e.is_active = 1`,
        [cycle_id, organization_id]
      );

      console.log(`Found ${lineManagers.length} line managers assigned to teams in this cycle`);

      if (lineManagers.length > 0) {
        // Get matrix parameters
        const [matrixParams] = await connection.execute(
          `SELECT parameter_id, weightage 
           FROM parameter_matrices 
           WHERE matrix_id = ?`,
          [cycle.line_manager_matrix_id]
        );

        for (const lm of lineManagers) {
          // Create evaluation record for each line manager
          const [evalResult] = await connection.execute(
            `INSERT INTO evaluations 
             (organization_id, cycle_id, cycle_team_assignment_id, employee_id,
              evaluation_period_start, evaluation_period_end, evaluation_date, status)
             VALUES (?, ?, NULL, ?, ?, ?, NOW(), 'draft')`,
            [organization_id, cycle_id, lm.id, cycle.start_date, cycle.end_date]
          );

          const evaluationId = evalResult.insertId;

          // Create evaluation details for each parameter
          for (const param of matrixParams) {
            await connection.execute(
              `INSERT INTO evaluation_details 
               (evaluation_id, parameter_id, score, created_at)
               VALUES (?, ?, NULL, NOW())`,
              [evaluationId, param.parameter_id]
            );
          }

          // Create evaluation status record
          await connection.execute(
            `INSERT INTO evaluation_status 
             (evaluation_id, status, updated_at)
             VALUES (?, 'pending', NOW())`,
            [evaluationId]
          );
        }

        console.log(`Created evaluations for ${lineManagers.length} line managers`);
      } else {
        console.log('No line managers assigned to teams in this cycle');
      }
    }

    await connection.commit();
    connection.release();

    console.log('Cycle activation completed successfully');

    // Send cycle activation notifications to all line managers and staff
    try {
      const [allEmployees] = await db.execute(
        `SELECT DISTINCT e.id FROM employees e
         WHERE e.organization_id = ? 
         AND e.role IN ('line-manager', 'staff')
         AND e.is_active = 1`,
        [organization_id]
      );

      const recipient_ids = allEmployees.map(emp => emp.id);

      if (recipient_ids.length > 0) {
        await NotificationService.sendCycleActivationNotification({
          organization_id,
          recipient_ids,
          cycle_name: cycle.name,
          cycle_id,
          start_date: cycle.start_date,
          end_date: cycle.end_date,
          admin_id: req.user.id
        });
      }
    } catch (notifError) {
      console.error('Failed to send activation notifications:', notifError);
      // Don't fail the activation if notifications fail
    }

    res.json({
      message: 'Cycle activated successfully!',
      data: {
        employees_evaluated: totalEmployees,
        evaluation_details_created: totalDetails,
        teams_processed: assignments.length
      }
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Cycle activation error:', error);
    console.error('Error stack:', error.stack);
    res.status(400).json({ error: error.message || 'Activation failed' });
  }
};

exports.assignTeam = async (req, res) => {
  const { cycle_id, team_id, matrix_id, line_manager_id } = req.body;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const cycle = await EvaluationCycle.findByIdAndOrg(cycle_id, organization_id);
    if (!cycle || cycle.status !== 'draft') {
      return res.status(400).json({ error: 'Invalid or locked cycle' });
    }

    const existing = await CycleTeamAssignment.findByCycleAndTeam(cycle_id, team_id);
    if (existing) return res.status(400).json({ error: 'Team already assigned to this cycle' });

    const [matrix] = await db.execute(
      `SELECT id, matrix_name FROM performance_matrices WHERE id = ? AND organization_id = ? AND status = 'active'`,
      [matrix_id, organization_id]
    );
    if (matrix.length === 0) return res.status(400).json({ error: 'Only active matrices allowed' });

    const [team] = await db.execute(
      `SELECT id, team_name FROM teams WHERE id = ? AND organization_id = ?`,
      [team_id, organization_id]
    );
    if (team.length === 0) return res.status(404).json({ error: 'Team not found' });

    const [manager] = await db.execute(
      `SELECT e.id FROM employees e 
       WHERE e.id = ? AND e.role = 'line-manager' AND e.organization_id = ?`,
      [line_manager_id, organization_id]
    );
    if (manager.length === 0) return res.status(400).json({ error: 'Evaluator must be a line_manager' });

    const assignmentId = await CycleTeamAssignment.create({
      cycle_id,
      team_id,
      matrix_id,
      line_manager_id,
      team_name: team[0].team_name,
      matrix_name: matrix[0].matrix_name
    });

    // Get employee count for the team
    const [teamMembers] = await db.execute(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = ?`,
      [team_id]
    );
    const employee_count = teamMembers[0]?.count || 0;

    // Send team assignment notification to line manager
    try {
      await NotificationService.sendTeamAssignmentNotification({
        organization_id,
        line_manager_id,
        cycle_id,
        cycle_name: cycle.name,
        team_name: team[0].team_name,
        employee_count,
        deadline: cycle.end_date,
        admin_id: req.user.id
      });
    } catch (notifError) {
      console.error('Failed to send team assignment notification:', notifError);
      // Don't fail the assignment if notification fails
    }

    // Evaluations are now created on activation only
    res.status(201).json({
      message: 'Team assigned successfully. Evaluations will be generated when cycle is activated.',
      assignment_id: assignmentId
    });
  } catch (error) {
    console.error('Assign team error:', error);
    res.status(500).json({ error: error.message || 'Assignment failed' });
  }
};

exports.getAssignments = async (req, res) => {
  const { cycleId } = req.params;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const assignments = await CycleTeamAssignment.findAllByCycle(cycleId, organization_id);
    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

exports.deleteAssignment = async (req, res) => {
  const { id } = req.params;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get assignment details to check cycle status
    const [assignment] = await db.execute(
      `SELECT cta.*, ec.status as cycle_status 
       FROM cycle_team_assignments cta
       JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
       WHERE cta.id = ? AND ec.organization_id = ?`,
      [id, organization_id]
    );

    if (assignment.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment[0].cycle_status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete assignments from non-draft cycles' });
    }

    await db.execute(
      'DELETE FROM cycle_team_assignments WHERE id = ?',
      [id]
    );

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
};

module.exports = exports;

exports.completeCycle = async (req, res) => {
  const { id: cycle_id } = req.params;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const cycle = await EvaluationCycle.findByIdAndOrg(cycle_id, organization_id);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }
    if (cycle.status !== 'active') {
      return res.status(400).json({ error: 'Only active cycles can be completed' });
    }

    await db.execute(
      `UPDATE evaluation_cycles SET status = 'closed' WHERE id = ?`,
      [cycle_id]
    );

    res.json({ message: 'Cycle marked as closed successfully' });
  } catch (error) {
    console.error('Complete cycle error:', error);
    res.status(500).json({ error: 'Failed to complete cycle' });
  }
};

exports.deleteCycle = async (req, res) => {
  const { id: cycle_id } = req.params;
  const { organizationId: organization_id } = req.user || {};

  if (!organization_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const cycle = await EvaluationCycle.findByIdAndOrg(cycle_id, organization_id);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }
    if (cycle.status === 'active') {
      return res.status(400).json({ error: 'Cannot delete active cycle. Please complete it first.' });
    }

    // Delete related data
    await db.execute(`DELETE FROM evaluations WHERE cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)`, [cycle_id]);
    await db.execute(`DELETE FROM cycle_team_assignments WHERE cycle_id = ?`, [cycle_id]);
    await db.execute(`DELETE FROM evaluation_cycles WHERE id = ?`, [cycle_id]);

    res.json({ message: 'Cycle deleted successfully' });
  } catch (error) {
    console.error('Delete cycle error:', error);
    res.status(500).json({ error: 'Failed to delete cycle' });
  }
};
