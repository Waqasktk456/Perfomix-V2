require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saas_perfomix'
};

async function debug() {
    console.log('Connecting to DB...', dbConfig);
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        console.log('\n--- Checking employees table schema ---');
        const [columns] = await connection.query('DESCRIBE employees');
        console.log(columns.map(c => c.Field).join(', '));

        console.log('\n--- Checking evaluation_status table schema ---');
        const [esColumns] = await connection.query('DESCRIBE evaluation_status');
        console.log(esColumns.map(c => c.Field).join(', '));

        console.log('\n--- Checking departments table schema ---');
        const [deptColumns] = await connection.query('DESCRIBE departments');
        console.log(deptColumns.map(c => c.Field).join(', '));

        console.log('\n--- Testing all-status Query ---');
        try {
            const [rows] = await connection.query(
                `SELECT 
        e.id AS Employee_id,
        e.first_name AS First_name,
        pm.id AS matrix_id
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN cycle_team_assignments cta ON t.id = cta.team_id
      LEFT JOIN performance_matrices pm ON cta.matrix_id = pm.id
      WHERE e.role = 'Staff'
      LIMIT 1`
            );
            console.log('Query success! Rows:', rows);
        } catch (qErr) {
            console.error('Query FAILED:', qErr.message);
        }

        await connection.end();
    } catch (err) {
        console.error('DB Connection Failed:', err);
    }
}

debug();
