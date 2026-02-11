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

    let totalEmployees = 0;
    let totalDetails = 0;

    for (const assignment of assignments) {
      const result = await EvaluationCycle.createEvaluationsForAssignment({
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

    await connection.commit();
    connection.release();

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

module.exports = exports;