// models/Matrix.js
const db = require('../config/db');

const Matrix = {
  create: async (matrix_name, organization_id, created_by, parameters, status = 'Draft') => {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Validate weightages
      const totalWeight = parameters.reduce((sum, p) => sum + Number(p.weightage), 0);

      // Rule: Never allow > 100
      if (totalWeight > 100) {
        throw new Error(`Total weightage cannot exceed 100%. Current sum: ${totalWeight}%`);
      }

      // Rule: If status is 'active', must be exactly 100
      if (status === 'active' && Math.abs(totalWeight - 100) > 0.01) {
        throw new Error(`Active matrices must have exactly 100% weightage. Current sum: ${totalWeight}%`);
      }

      // Force status to 'Draft' if not exactly 100% (even if user tries to activate)
      let finalStatus = status;
      if (Math.abs(totalWeight - 100) > 0.01) {
        finalStatus = 'Draft';
      }

      const [matrixRes] = await connection.query(
        `INSERT INTO performance_matrices 
         (matrix_name, organization_id, created_by, status) 
         VALUES (?, ?, ?, ?)`,
        [matrix_name, organization_id, created_by, finalStatus]
      );

      const matrix_id = matrixRes.insertId;

      for (const param of parameters) {
        await connection.query(
          `INSERT INTO parameter_matrices 
           (matrix_id, parameter_id, weightage) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE weightage = VALUES(weightage)`,
          [matrix_id, param.parameter_id, param.weightage]
        );
      }

      await connection.commit();
      return {
        success: true,
        matrix_id,
        status: finalStatus,
        totalWeight,
        message: `Matrix ${finalStatus === 'Draft' ? 'saved as draft' : 'created and activated'} successfully`
      };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  getAll: async (organization_id) => {
    const [rows] = await db.query(`
      SELECT 
        m.id AS matrix_id,
        m.matrix_name,
        m.status,
        m.created_at,
        (SELECT COUNT(*) 
         FROM cycle_team_assignments cta 
         JOIN evaluation_cycles ec ON cta.cycle_id = ec.id 
         WHERE cta.matrix_id = m.id AND LOWER(ec.status) = 'active') as is_in_active_cycle,
        COALESCE(JSON_ARRAYAGG(
          JSON_OBJECT(
            'parameter_id', p.id,
            'parameter_name', p.parameter_name,
            'description', p.description,
            'weightage', pm.weightage
          )
        ), JSON_ARRAY()) AS parameters
      FROM performance_matrices m
      LEFT JOIN parameter_matrices pm ON m.id = pm.matrix_id
      LEFT JOIN parameters p ON pm.parameter_id = p.id
      WHERE m.organization_id = ? AND m.status != 'deleted'
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `, [organization_id]);

    return rows.map(row => ({
      matrix_id: row.matrix_id,
      matrix_name: row.matrix_name,
      status: row.status,
      created_at: row.created_at,
      is_in_active_cycle: row.is_in_active_cycle,
      parameters: row.parameters || []
    }));
  },

  getById: async (matrix_id, organization_id) => {
    const [rows] = await db.query(`
      SELECT 
        m.id AS matrix_id,
        m.matrix_name,
        m.status,
        COALESCE(JSON_ARRAYAGG(
          JSON_OBJECT(
            'parameter_id', p.id,
            'parameter_name', p.parameter_name,
            'description', p.description,
            'weightage', pm.weightage
          )
        ), JSON_ARRAY()) AS parameters
      FROM performance_matrices m
      LEFT JOIN parameter_matrices pm ON m.id = pm.matrix_id
      LEFT JOIN parameters p ON pm.parameter_id = p.id
      WHERE m.id = ? AND m.organization_id = ?
      GROUP BY m.id
    `, [matrix_id, organization_id]);

    if (rows.length === 0) return null;

    return {
      matrix_id: rows[0].matrix_id,
      matrix_name: rows[0].matrix_name,
      status: rows[0].status,
      parameters: rows[0].parameters || []
    };
  },

  update: async (matrix_id, matrix_name, organization_id, parameters, status = 'Draft', created_by) => {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. Archive the existing matrix if it was 'active'
      // If it was a 'Draft', we can overwrite it or version it. 
      // Enterprise rule: Version everything once it's used.

      const [oldMatrix] = await connection.query(
        'SELECT status FROM performance_matrices WHERE id = ? AND organization_id = ?',
        [matrix_id, organization_id]
      );

      if (oldMatrix.length === 0) {
        throw new Error('Matrix not found');
      }

      // If active, we MUST archive and create new version
      if (oldMatrix[0].status === 'active' || oldMatrix[0].status === 'archived') {
        // Archive old
        await connection.query(
          'UPDATE performance_matrices SET status = "archived" WHERE id = ?',
          [matrix_id]
        );

        // Create new version
        const [newMatrixRes] = await connection.query(
          `INSERT INTO performance_matrices 
           (matrix_name, organization_id, created_by, status) 
           VALUES (?, ?, ?, ?)`,
          [matrix_name, organization_id, created_by, status]
        );

        const new_matrix_id = newMatrixRes.insertId;

        for (const param of parameters) {
          await connection.query(
            `INSERT INTO parameter_matrices 
             (matrix_id, parameter_id, weightage) 
             VALUES (?, ?, ?)`,
            [new_matrix_id, param.parameter_id, param.weightage]
          );
        }

        await connection.commit();
        return {
          success: true,
          matrix_id: new_matrix_id,
          status,
          message: 'Active matrix archived and new version created successfully'
        };
      } else {
        // If it was a Draft, we can just update it
        const [updateRes] = await connection.query(
          `UPDATE performance_matrices 
           SET matrix_name = ?, status = ?
           WHERE id = ? AND organization_id = ?`,
          [matrix_name, status, matrix_id, organization_id]
        );

        await connection.query('DELETE FROM parameter_matrices WHERE matrix_id = ?', [matrix_id]);

        for (const param of parameters) {
          await connection.query(
            `INSERT INTO parameter_matrices 
             (matrix_id, parameter_id, weightage) 
             VALUES (?, ?, ?)`,
            [matrix_id, param.parameter_id, param.weightage]
          );
        }

        await connection.commit();
        return { success: true, matrix_id, status, message: 'Draft matrix updated successfully' };
      }
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  delete: async (matrix_id, organization_id) => {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Soft delete by setting status to 'deleted'
      const [result] = await connection.query(
        'UPDATE performance_matrices SET status = ? WHERE id = ? AND organization_id = ?',
        ['deleted', matrix_id, organization_id]
      );

      if (result.affectedRows === 0) {
        throw new Error('Matrix not found or access denied');
      }

      await connection.commit();
      return { success: true, message: 'Matrix deleted successfully' };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = Matrix;