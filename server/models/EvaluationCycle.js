// models/EvaluationCycle.js
const db = require('../config/db');

class EvaluationCycle {
  static async create({ cycle_name, start_date, end_date, organization_id, created_by }) {
    if (!cycle_name || !start_date || !end_date || !organization_id) {
      throw new Error('Missing required fields for cycle creation');
    }

    const [result] = await db.execute(
      `INSERT INTO evaluation_cycles 
       (organization_id, cycle_name, start_date, end_date, status, created_by, created_at)
       VALUES (?, ?, ?, ?, 'draft', ?, NOW())`,
      [organization_id, cycle_name, start_date, end_date, created_by]
    );

    return result.insertId;
  }

  static async findAllByOrg(organization_id) {
    if (!organization_id) throw new Error('organization_id is required');

    const [rows] = await db.execute(
      `SELECT 
         id, 
         cycle_name AS name, 
         start_date, 
         end_date, 
         status, 
         created_at,
         created_by
       FROM evaluation_cycles 
       WHERE organization_id = ?
       ORDER BY created_at DESC`,
      [organization_id]
    );

    return rows;
  }

  static async findByIdAndOrg(id, organization_id) {
    if (!id || !organization_id) throw new Error('id and organization_id required');

    const [rows] = await db.execute(
      `SELECT 
         id, 
         cycle_name AS name, 
         start_date, 
         end_date, 
         status, 
         created_at,
         created_by
       FROM evaluation_cycles 
       WHERE id = ? AND organization_id = ?`,
      [id, organization_id]
    );

    return rows[0] || null;
  }

  static async update(id, { cycle_name, start_date, end_date }) {
    if (!cycle_name || !start_date || !end_date) {
      throw new Error('All fields are required for update');
    }

    await db.execute(
      `UPDATE evaluation_cycles 
       SET cycle_name = ?, start_date = ?, end_date = ?
       WHERE id = ?`,
      [cycle_name, start_date, end_date, id]
    );
  }

  static async getAssignmentCount(cycle_id) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM cycle_team_assignments 
       WHERE cycle_id = ?`,
      [cycle_id]
    );

    return rows[0].count;
  }

  static async getTeamAssignmentsForCycle(cycle_id) {
    const [rows] = await db.execute(
      `SELECT 
         cta.id AS assignment_id,
         cta.team_id,
         cta.matrix_id,
         cta.line_manager_id AS evaluator_id
       FROM cycle_team_assignments cta
       WHERE cta.cycle_id = ?`,
      [cycle_id]
    );
    return rows;
  }

  static async checkTeamInActiveCycle(team_ids, current_cycle_id) {
    if (team_ids.length === 0) return [];
    const placeholders = team_ids.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT DISTINCT cta.team_id
       FROM cycle_team_assignments cta
       JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
       WHERE cta.team_id IN (${placeholders})
         AND ec.status = 'active'
         AND ec.id != ?`,
      [...team_ids, current_cycle_id]
    );
    return rows.map(r => r.team_id);
  }

  static async checkMatrixInActiveCycle(matrix_ids) {
    if (matrix_ids.length === 0) return [];
    console.log(`Checking matrices in active cycles: ${matrix_ids}`);
    const placeholders = matrix_ids.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT DISTINCT cta.matrix_id
       FROM cycle_team_assignments cta
       JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
       WHERE cta.matrix_id IN (${placeholders})
         AND LOWER(ec.status) = 'active'`,
      [...matrix_ids]
    );
    console.log(`Found active matrices: ${JSON.stringify(rows)}`);
    return rows.map(r => r.matrix_id);
  }

  static async createEvaluationsForAssignment({
    assignment_id,
    cycle_id,
    team_id,
    matrix_id,
    evaluator_id,
    start_date,
    end_date,
    organization_id
  }) {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [employees] = await connection.execute(
        `SELECT e.id AS employee_id 
         FROM employees e
         INNER JOIN team_members tm ON e.id = tm.employee_id
         WHERE tm.team_id = ? 
           AND e.organization_id = ? 
           AND e.deleted_at IS NULL`,
        [team_id, organization_id]
      );

      console.log(`Found ${employees.length} employees for team ${team_id}`);

      if (employees.length === 0) {
        await connection.commit();
        connection.release();
        return { employeesCreated: 0, detailsCreated: 0 };
      }

      const [parameters] = await connection.execute(
        `SELECT parameter_id 
         FROM parameter_matrices 
         WHERE matrix_id = ?`,
        [matrix_id]
      );

      if (parameters.length === 0) {
        throw new Error(`Matrix ${matrix_id} has no parameters`);
      }

      const evalValues = employees.map(emp => [
        organization_id,
        cycle_id,
        assignment_id,
        emp.employee_id,
        start_date,
        end_date,
        'draft',
        new Date()
      ]);

      await connection.query(
        `INSERT INTO evaluations 
         (organization_id, cycle_id, cycle_team_assignment_id, employee_id,
          evaluation_period_start, evaluation_period_end, status, evaluation_date)
         VALUES ?`,
        [evalValues]
      );

      const [evalIdsRes] = await connection.query(
        `SELECT id AS evaluation_id 
         FROM evaluations 
         WHERE cycle_team_assignment_id = ? 
         ORDER BY id DESC 
         LIMIT ?`,
        [assignment_id, employees.length]
      );

      const evaluationIds = evalIdsRes.map(r => r.evaluation_id);

      const detailValues = [];
      for (let i = 0; i < employees.length; i++) {
        const evaluation_id = evaluationIds[i];
        const employee_id = employees[i].employee_id;

        for (const param of parameters) {
          detailValues.push([
            evaluation_id,
            param.parameter_id,
            null,
            null
          ]);

          await connection.query(
            `INSERT INTO evaluation_status 
             (evaluation_id, employee_id, parameter_id, status)
             VALUES (?, ?, ?, 'Pending')
             ON DUPLICATE KEY UPDATE status = 'Pending'`,
            [evaluation_id, employee_id, param.parameter_id]
          );
        }
      }

      if (detailValues.length > 0) {
        await connection.query(
          `INSERT INTO evaluation_details 
           (evaluation_id, parameter_id, score, comments)
           VALUES ?`,
          [detailValues]
        );
      }

      await connection.commit();
      connection.release();

      return {
        employeesCreated: employees.length,
        detailsCreated: detailValues.length
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }
}

module.exports = EvaluationCycle;