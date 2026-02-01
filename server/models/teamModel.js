const db = require('../config/db');

exports.createTeam = async (connection, teamData) => {
  const query = `
    INSERT INTO teams 
    (organization_id, department_id, team_name, team_description, line_manager_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [
    teamData.organization_id,
    teamData.department_id,
    teamData.team_name,
    teamData.team_description,
    teamData.line_manager_id
  ];

  const [result] = await connection.query(query, values);
  return result.insertId;
};

exports.addTeamMembers = async (connection, teamId, memberIds) => {
  const values = memberIds.map(empId => [teamId, empId]);

  const query = `
    INSERT INTO team_members (team_id, employee_id)
    VALUES ?
  `;

  await connection.query(query, [values]);
};
exports.getteamsByOrganization = async (org_id) => {
  const query = `
    SELECT t.*, d.department_name,
    (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as number_of_members,
    (SELECT COUNT(*) 
     FROM cycle_team_assignments cta 
     JOIN evaluation_cycles ec ON cta.cycle_id = ec.id 
     WHERE cta.team_id = t.id AND ec.status = 'active') as is_in_active_cycle
    FROM teams t
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.organization_id = ? AND t.is_active = 1
    ORDER BY t.created_at DESC
  `;
  const [rows] = await db.query(query, [org_id]);
  return rows;
};

exports.getAllTeams = async () => {
  const query = `
    SELECT t.*, o.organization_name
    FROM teams t 
    LEFT JOIN organizations o ON t.organization_id = o.id
    WHERE t.is_active = 1
    ORDER BY t.created_at DESC
  `;
  const [rows] = await db.query(query);
  return rows;
};

/**
 * Get team details + member IDs
 */
exports.getTeamById = async (teamId) => {
  const teamQuery = `
    SELECT t.*, d.department_name
    FROM teams t
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.id = ? AND t.is_active = 1
  `;
  const [teamRows] = await db.query(teamQuery, [teamId]);
  if (teamRows.length === 0) return null;

  const membersQuery = 'SELECT employee_id FROM team_members WHERE team_id = ?';
  const [memberRows] = await db.query(membersQuery, [teamId]);

  return {
    ...teamRows[0],
    member_ids: memberRows.map(row => row.employee_id)
  };
};

exports.updateTeam = async (connection, teamId, teamData) => {
  const query = `
    UPDATE teams 
    SET department_id = ?, team_name = ?, team_description = ?, line_manager_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const values = [
    teamData.department_id,
    teamData.team_name,
    teamData.team_description || null,
    teamData.line_manager_id || null,
    teamId
  ];
  await connection.query(query, values);
};

exports.removeTeamMembers = async (connection, teamId) => {
  await connection.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
};

exports.deleteTeam = async (teamId) => {
  const query = 'UPDATE teams SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
  const [result] = await db.query(query, [teamId]);
  return result.affectedRows > 0;
};
