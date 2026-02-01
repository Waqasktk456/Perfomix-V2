require('dotenv').config();
console.log('employees.js router loaded');
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saas_perfomix'
};
let pool;
try {
  pool = mysql.createPool(dbConfig);
} catch (error) {
  console.error('Failed to create database connection pool:', error);
  process.exit(1);
}

// Get all staff evaluations status
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        e.id AS Employee_id,
        e.first_name AS First_name,
        e.last_name AS Last_name,
        e.designation AS Designation,
        e.profile_image AS Profile_image,
        d.department_name AS Department_name,
        pm.id AS matrix_id,
        (SELECT COUNT(*) FROM parameter_matrices pmx WHERE pmx.matrix_id = pm.id) AS total_params,
        (SELECT COUNT(*) 
         FROM evaluation_status es 
         JOIN evaluations ev ON es.evaluation_id = ev.id
         JOIN cycle_team_assignments cta2 ON ev.cycle_team_assignment_id = cta2.id
         WHERE es.employee_id = e.id AND cta2.matrix_id = pm.id AND es.status = 'Completed'
        ) AS completed_params
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN team_members tm ON e.id = tm.employee_id
      LEFT JOIN teams t ON tm.team_id = t.id
      LEFT JOIN cycle_team_assignments cta ON t.id = cta.team_id
      LEFT JOIN performance_matrices pm ON cta.matrix_id = pm.id
      WHERE e.role = 'Staff' AND pm.id IS NOT NULL`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get employees by department
router.get('/department/:departmentCode', async (req, res) => {
  const { departmentCode } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT e.*, d.department_name AS Department_name 
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE d.department_code = ? AND e.role = 'Staff'`,
      [departmentCode]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching employees by department:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch employees', message: err.message });
  }
});

module.exports = router;