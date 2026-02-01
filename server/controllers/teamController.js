const { releaseConnection } = require('../config/db');
const Teams = require('../models/teamModel');
const EvaluationCycle = require('../models/EvaluationCycle');
const db = require('../db');
const { errorMonitor } = require('nodemailer/lib/xoauth2');


// Helper: Extract user from JWT
const getUserFromRequest = (req) => {
  return req.user || null;
};
exports.getAllTeams = async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({
        error: 'Access dneied,No organization is associated with your '

      })
    }
    const teams = await Teams.getteamsByOrganization(organizationId);
    res.json(teams);
  } catch (error) {
    console.log("error in fetching temas");
    res.status(500).json({ error: 'failed to fetch teams' })
  }

}
exports.createteam = async (req, res) => {
  let connection;
  try {
    const user = getUserFromRequest(req);
    const { team_name, department_id, team_description, line_manager_id, member_ids } = req.body;
    if (!user?.organizationId) {
      return res.status(403).json({ error: "Access denied.NO organziation found" });
    }
    if (!team_name || !department_id) {
      return res.status(400).json({ error: "Team name and team id are required" });
    }
    if (!Array.isArray(member_ids)) {
      return res.status(400).json({ error: "memebrs id must be an array" });
    }
    connection = await db.getConnection();
    await connection.beginTransaction();
    const teamId = await Teams.createTeam(connection, {
      organization_id: user.organizationId,
      department_id,
      team_name,
      team_description: team_description || null,
      line_manager_id: line_manager_id || null,
    });
    if (member_ids.length > 0) {
      await Teams.addTeamMembers(connection, teamId, member_ids)
    }

    await connection.commit();

    res.status(201).json({
      message: "Team created successfully",
      team_id: teamId
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Create team error:", error);
    res.status(500).json({ error: "Failed to create team" });
  } finally {
    if (connection) connection.release();
  }
};

exports.getTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Teams.getTeamById(id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json({ data: team });
  } catch (error) {
    console.error("Get team error:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};

exports.updateteam = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { team_name, department_id, team_description, line_manager_id, member_ids } = req.body;

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if team is in an active evaluation cycle
    const teamsInActiveCycle = await EvaluationCycle.checkTeamInActiveCycle([id], 0);
    if (teamsInActiveCycle.length > 0) {
      if (connection) await connection.rollback();
      return res.status(400).json({
        error: "Team is in an active cycle cannot be edit or delete"
      });
    }

    // 1. Update basic team info
    await Teams.updateTeam(connection, id, {
      department_id,
      team_name,
      team_description: team_description || null,
      line_manager_id: line_manager_id || null
    });

    // 2. Refresh members: remove old ones, add new ones
    await Teams.removeTeamMembers(connection, id);
    if (member_ids && member_ids.length > 0) {
      await Teams.addTeamMembers(connection, id, member_ids);
    }

    await connection.commit();
    res.json({ message: "Team updated successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Update team error:", error);
    res.status(500).json({ error: "Failed to update team" });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team is in an active evaluation cycle
    const teamsInActiveCycle = await EvaluationCycle.checkTeamInActiveCycle([id], 0);
    if (teamsInActiveCycle.length > 0) {
      return res.status(400).json({
        error: "Team is in an active cycle cannot be edit or delete"
      });
    }

    const success = await Teams.deleteTeam(id);
    if (!success) return res.status(404).json({ error: "Team not found" });
    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Delete team error:", error);
    res.status(500).json({ error: "Failed to delete team" });
  }
};
