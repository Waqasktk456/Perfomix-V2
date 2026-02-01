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

        const organizationId = 1; // Assuming we want to check Org 1 (Namal University)

        // Check 1: Employees with Teams
        console.log('\n--- Check 1: Employees with Teams? ---');
        const [eTeam] = await connection.query(`SELECT id, first_name, team_id FROM employees WHERE organization_id = ?`, [organizationId]);
        console.log('Employees with team_id:', eTeam.filter(e => e.team_id).length);
        console.log('Sample:', eTeam.find(e => e.team_id));

        // Check 2: Teams with Cycle Assignments?
        console.log('\n--- Check 2: Cycle Team Assignments? ---');
        const [ctaRows] = await connection.query(`SELECT * FROM cycle_team_assignments`);
        console.log('Total CTA rows:', ctaRows.length);
        if (ctaRows.length > 0) console.log('Sample CTA:', ctaRows[0]);

        // Check 3: Full Link Test (Employees -> Team Members -> Teams -> CTA -> Matrix)
        console.log('\n--- Check 3: Full Link Test (via team_members) ---');
        const [linkTest] = await connection.query(`
      SELECT e.id AS emp_id, tm.team_id, t.id AS team_id, cta.id AS cta_id, pm.id AS matrix_id
      FROM employees e
      LEFT JOIN team_members tm ON e.id = tm.employee_id
      LEFT JOIN teams t ON tm.team_id = t.id
      LEFT JOIN cycle_team_assignments cta ON t.id = cta.team_id
      LEFT JOIN performance_matrices pm ON cta.matrix_id = pm.id
      WHERE e.organization_id = ?
    `, [organizationId]);
        console.log('Rows found:', linkTest.length);
        console.log('Rows with Matrix ID:', linkTest.filter(r => r.matrix_id).length);
        if (linkTest.length > 0) console.log('Sample Row:', linkTest[0]);

        console.log(`\n--- Testing /employees Query for Org ${organizationId} ---`);
        // Test 'staff' vs 'Staff'
        const [staffLower] = await connection.query(`SELECT count(*) as c FROM employees WHERE organization_id = ? AND role = 'staff'`, [organizationId]);
        const [staffUpper] = await connection.query(`SELECT count(*) as c FROM employees WHERE organization_id = ? AND role = 'Staff'`, [organizationId]);
        console.log(`Role 'staff': ${staffLower[0].c}, Role 'Staff': ${staffUpper[0].c}`);

        // Test 'completed' vs 'Completed'
        const [compLower] = await connection.query(`SELECT count(*) as c FROM evaluation_status WHERE status = 'completed'`);
        const [compUpper] = await connection.query(`SELECT count(*) as c FROM evaluation_status WHERE status = 'Completed'`);
        console.log(`Status 'completed': ${compLower[0].c}, Status 'Completed': ${compUpper[0].c}`);

        console.log(`\n--- Testing /evaluations/all-status Query for Org ${organizationId} ---`);
        const query = `SELECT 
        e.id AS Employee_id,
        e.first_name AS First_name,
        pm.id AS matrix_id,
        CASE 
          WHEN (SELECT COUNT(*) FROM parameter_matrices pmx WHERE pmx.matrix_id = pm.id) > 0
            AND (SELECT COUNT(*) FROM parameter_matrices pmx WHERE pmx.matrix_id = pm.id) = 
                (SELECT COUNT(*) 
                 FROM evaluation_status es2 
                 JOIN evaluations ev ON es2.evaluation_id = ev.id
                 JOIN cycle_team_assignments cta2 ON ev.cycle_team_assignment_id = cta2.id
                 WHERE es2.employee_id = e.id AND cta2.matrix_id = pm.id AND es2.status = 'Completed'
                )
          THEN 'Complete'
          ELSE 'Pending'
        END AS evaluation_status,
        COALESCE(AVG((pmx.weightage / 100) * ed.score), 0) AS overall_weighted_score
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN team_members tm ON e.id = tm.employee_id
      LEFT JOIN teams t ON tm.team_id = t.id
      LEFT JOIN cycle_team_assignments cta ON t.id = cta.team_id
      LEFT JOIN performance_matrices pm ON cta.matrix_id = pm.id
      LEFT JOIN evaluations ev ON ev.employee_id = e.id AND ev.cycle_team_assignment_id = cta.id
      LEFT JOIN evaluation_status es ON es.evaluation_id = ev.id
      LEFT JOIN evaluation_details ed ON es.evaluation_id = ed.evaluation_id
      LEFT JOIN parameter_matrices pmx ON pmx.matrix_id = cta.matrix_id AND pmx.parameter_id = ed.parameter_id
      WHERE e.role = 'Staff' AND e.organization_id = ? AND pm.id IS NOT NULL
      GROUP BY e.id, e.first_name, pm.id`;

        try {
            const [rows] = await connection.query(query, [organizationId]);
            console.log(`Query Success! Found ${rows.length} rows.`);
            console.log(rows);
        } catch (qErr) {
            console.error('Query FAILED:', qErr.message);
        }

        await connection.end();
    } catch (err) {
        console.error('DB Connection Failed:', err);
    }
}

debug();
