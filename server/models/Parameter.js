// models/Parameter.js
const db = require('../config/db');

const Parameter = {
  create: async (parameter_name, description, organization_id = null) => {
    const [result] = await db.query(
      'INSERT INTO parameters (parameter_name, description, organization_id) VALUES (?, ?, ?)',
      [parameter_name, description, organization_id]
    );
    return result.insertId;
  },

  getAll: async (organization_id = null) => {
    let query = 'SELECT * FROM parameters WHERE status = "active" AND deleted_at IS NULL';
    const params = [];
    if (organization_id !== null) {
      query += ' AND (organization_id = ? OR is_global = 1)';
      params.push(organization_id);
    } else {
      query += ' AND is_global = 1';
    }
    const [rows] = await db.query(query, params);
    return rows;
  },

  // NEW: Update parameter
  update: async (parameter_id, parameter_name, description, organization_id) => {
    const [result] = await db.query(
      `UPDATE parameters 
       SET parameter_name = ?, description = ? 
       WHERE id = ? AND (organization_id = ? OR organization_id IS NULL)`,
      [parameter_name, description || null, parameter_id, organization_id]
    );
    return result.affectedRows > 0;
  },

  // NEW: Soft delete parameter
  delete: async (parameter_id, organization_id) => {
    const [result] = await db.query(
      `UPDATE parameters 
       SET deleted_at = CURRENT_TIMESTAMP, status = "inactive" 
       WHERE id = ? AND (organization_id = ? OR organization_id IS NULL)`,
      [parameter_id, organization_id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = Parameter;