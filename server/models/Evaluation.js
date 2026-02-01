// models/Evaluation.js
const db = require('../config/db');

class Evaluation {
  // FIXED: Use team_members junction table
  static async getEmployeesInTeam(team_id, organization_id) {
    const [rows] = await db.execute(
      `SELECT e.id 
       FROM employees e
       INNER JOIN team_members tm ON e.id = tm.employee_id
       WHERE tm.team_id = ? 
         AND e.organization_id = ? 
         AND e.is_active = 1 
         AND e.deleted_at IS NULL`,
      [team_id, organization_id]
    );
    return rows;
  }

  static async createBulk(evaluations) {
    if (evaluations.length === 0) return;

    const values = evaluations.map(e => [
      e.organization_id,
      e.cycle_id,
      e.cycle_team_assignment_id,
      e.employee_id,
      e.evaluation_period_start,
      e.evaluation_period_end,
      'draft',
      new Date()
    ]);

    await db.query(
      `INSERT INTO evaluations 
       (organization_id, cycle_id, cycle_team_assignment_id, employee_id, 
        evaluation_period_start, evaluation_period_end, status, evaluation_date)
       VALUES ?`,
      [values]
    );
  }
}

module.exports = Evaluation;