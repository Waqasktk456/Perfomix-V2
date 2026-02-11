// models/CycleTeamAssignment.js
const db = require('../config/db');

class CycleTeamAssignment {
  static async create({ cycle_id, team_id, matrix_id, line_manager_id, team_name, matrix_name }) {
    const [result] = await db.execute(
      `INSERT INTO cycle_team_assignments 
       (cycle_id, team_id, matrix_id, evaluator_id, line_manager_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [cycle_id, team_id, matrix_id, line_manager_id, line_manager_id]
    );
    return result.insertId;
  }

  static async findByCycleAndTeam(cycle_id, team_id) {
    const [rows] = await db.execute(
      `SELECT id FROM cycle_team_assignments WHERE cycle_id = ? AND team_id = ?`,
      [cycle_id, team_id]
    );
    return rows[0] || null;
  }

  static async findAllByCycle(cycle_id, organization_id) {
    const [rows] = await db.execute(
      `SELECT 
         cta.id,
         cta.team_id, 
         COALESCE(t.team_name, 'Unknown Team') AS team_name,
         cta.matrix_id, 
         COALESCE(pm.matrix_name, 'Unknown Matrix') AS matrix_name,
         cta.line_manager_id,
         CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS evaluator_name
       FROM cycle_team_assignments cta
       LEFT JOIN teams t ON cta.team_id = t.id AND t.organization_id = ?
       LEFT JOIN performance_matrices pm ON cta.matrix_id = pm.id
       LEFT JOIN employees e ON cta.line_manager_id = e.id
       WHERE cta.cycle_id = ?
       ORDER BY cta.created_at DESC`,
      [organization_id, cycle_id]
    );
    return rows;
  }
}

module.exports = CycleTeamAssignment;