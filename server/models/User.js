// models/User.js
const pool = require('../config/db');

class User {
  static async findByEmail(email) {
    try {
      // 1. First, check employees table (for staff & line-managers)
      const [employeeRows] = await pool.execute(
        `SELECT 
           id AS Employee_id,
           email AS Email,
           user_password AS password,
           role AS Role,
           first_name AS First_name,
           last_name AS Last_name
         FROM employees 
         WHERE email = ? AND deleted_at IS NULL`,
        [email]
      );

      if (employeeRows.length > 0) {
        const emp = employeeRows[0];
        return {
          id: emp.Employee_id,                    // Important for JWT
          email: emp.Email,
          password: emp.password,                 // This enables normal login
          role: emp.Role,
          name: `${emp.First_name} ${emp.Last_name}`,
          Employee_id: emp.Employee_id
        };
      }

      // 2. If not employee, check users table (for super admins from Google)
      const [userRows] = await pool.execute(
        `SELECT id, email, password, role, name, picture FROM users WHERE email = ?`,
        [email]
      );

      return userRows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async createUser(userData) {
    try {
      const { googleId, email, name, picture, role = 'admin', password } = userData;

      const [result] = await pool.execute(
        'INSERT INTO users (google_id, email, name, picture, role, password) VALUES (?, ?, ?, ?, ?, ?)',
        [googleId, email, name, picture, role, password || null]
      );

      console.log(`User created with role: ${role}, ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }
}

module.exports = User;