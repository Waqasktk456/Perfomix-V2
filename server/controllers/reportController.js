const db = require('../config/db');

// Helper to get organization info
const getOrgInfo = async (orgId) => {
    const [rows] = await db.query('SELECT organization_name FROM organizations WHERE id = ?', [orgId]);
    return rows[0] || { organization_name: 'Perfomix' };
};

// 1. Admin - Organization Overall Summary
exports.getAdminOrgSummary = async (req, res) => {
    try {
        const { cycle_id } = req.query;
        const orgId = req.user.organizationId;

        if (!cycle_id) {
            return res.status(400).json({ success: false, message: 'Cycle ID is required' });
        }

        const orgInfo = await getOrgInfo(orgId);

        // Get Cycle Info
        const [cycleRows] = await db.query(
            'SELECT cycle_name, start_date, end_date FROM evaluation_cycles WHERE id = ? AND organization_id = ?',
            [cycle_id, orgId]
        );
        if (cycleRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cycle not found' });
        }
        const cycle = cycleRows[0];

        // Summary Statistics
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(*) as total_evaluations,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status != 'completed' THEN 1 END) as pending_count,
                AVG(CASE WHEN status = 'completed' THEN (
                    SELECT SUM((ed.score * pmx.weightage) / 100)
                    FROM evaluation_details ed
                    JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id
                    WHERE ed.evaluation_id = evaluations.id
                ) END) as avg_score
            FROM evaluations 
            WHERE organization_id = ? AND cycle_team_assignment_id IN (
                SELECT id FROM cycle_team_assignments WHERE cycle_id = ?
            )
        `, [orgId, cycle_id]);

        const stats = statsRows[0];

        // Top Performers
        const [topPerformers] = await db.query(`
            SELECT e.first_name as First_name, e.last_name as Last_name, 
                (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id) as overall_score, 
                e.designation as Designation
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            WHERE ev.organization_id = ? AND ev.status = 'completed' 
            AND ev.cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            ORDER BY overall_score DESC
            LIMIT 5
        `, [orgId, cycle_id]);

        // Lowest Performers
        const [lowPerformers] = await db.query(`
            SELECT e.first_name as First_name, e.last_name as Last_name, 
                (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id) as overall_score, 
                e.designation as Designation
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            WHERE ev.organization_id = ? AND ev.status = 'completed'
            AND ev.cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            ORDER BY overall_score ASC
            LIMIT 5
        `, [orgId, cycle_id]);

        // Performance Distribution
        const [distribution] = await db.query(`
            SELECT 
                CASE 
                    WHEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = evaluations.id) >= 90 THEN 'Excellent'
                    WHEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = evaluations.id) >= 80 THEN 'Good'
                    WHEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = evaluations.id) >= 70 THEN 'Average'
                    ELSE 'Poor'
                END as level,
                COUNT(*) as count
            FROM evaluations
            WHERE organization_id = ? AND status = 'completed'
            AND cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            GROUP BY level
        `, [orgId, cycle_id]);

        // Department-wise Average
        const [deptStats] = await db.query(`
            SELECT d.department_name as Department_name, 
                AVG((SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id)) as avg_score
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            JOIN departments d ON e.department_id = d.id
            WHERE ev.organization_id = ? AND ev.status = 'completed'
            AND ev.cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            GROUP BY d.department_name
        `, [orgId, cycle_id]);

        res.json({
            success: true,
            header: {
                organization_name: orgInfo.organization_name,
                cycle_name: cycle.cycle_name,
                start_date: cycle.start_date,
                end_date: cycle.end_date,
                generation_date: new Date()
            },
            summary: {
                total_employees: stats.total_evaluations,
                completed: stats.completed_count,
                pending: stats.pending_count,
                average_score: stats.avg_score ? parseFloat(stats.avg_score).toFixed(2) : 0
            },
            top_performers: topPerformers,
            low_performers: lowPerformers,
            distribution: distribution,
            dept_stats: deptStats
        });

    } catch (error) {
        console.error('Admin Org Summary Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. Admin - Employee Performance Table
exports.getAdminEmployeeList = async (req, res) => {
    try {
        const { cycle_id, department_id, team_id } = req.query;
        const orgId = req.user.organizationId;

        let query = `
            SELECT 
                e.id as employee_id,
                CONCAT(e.first_name, ' ', e.last_name) as name,
                d.department_name as department,
                t.team_name as team,
                CONCAT(mgr_e.first_name, ' ', mgr_e.last_name) as manager_name,
                ev.overall_score as total_score,
                ev.status as evaluation_status,
                CASE 
                    WHEN ev.overall_score >= 90 THEN 'Excellent'
                    WHEN ev.overall_score >= 80 THEN 'Good'
                    WHEN ev.overall_score >= 70 THEN 'Average'
                    ELSE 'Poor'
                END as performance_level
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN teams t ON e.team_id = t.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN employees mgr_e ON cta.line_manager_id = mgr_e.id
            WHERE ev.organization_id = ? AND cta.cycle_id = ?
        `;

        const params = [orgId, cycle_id];

        if (department_id) {
            query += " AND e.Department_id = ?";
            params.push(department_id);
        }
        if (team_id) {
            query += " AND e.team_id = ?";
            params.push(team_id);
        }

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            employees: rows
        });

    } catch (error) {
        console.error('Admin Employee List Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. Line Manager - Team Performance Report
exports.getTeamReport = async (req, res) => {
    try {
        const { assignment_id } = req.query;
        const managerId = req.user.id;
        const orgId = req.user.organizationId;

        // Verify assignment belongs to manager or user is admin
        let assignmentQuery = `
            SELECT cta.*, t.team_name, ec.cycle_name, ec.start_date, ec.end_date
            FROM cycle_team_assignments cta
            JOIN teams t ON cta.team_id = t.id
            JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
            WHERE cta.id = ? AND cta.organization_id = ?
        `;
        const assignmentParams = [assignment_id, orgId];

        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            assignmentQuery += " AND cta.line_manager_id = ?";
            assignmentParams.push(managerId);
        }

        const [assignmentRows] = await db.query(assignmentQuery, assignmentParams);

        if (assignmentRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized or invalid assignment' });
        }
        const assignment = assignmentRows[0];

        // Team Summary
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                AVG(CASE WHEN status = 'completed' THEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = evaluations.id) END) as avg_score,
                MAX(CASE WHEN status = 'completed' THEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = evaluations.id) END) as max_score,
                MIN(CASE WHEN status = 'completed' THEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = evaluations.id) END) as min_score
            FROM evaluations
            WHERE cycle_team_assignment_id = ?
        `, [assignment_id]);
        const stats = statsRows[0];

        // Employee List
        const [employees] = await db.query(`
            SELECT 
                CONCAT(e.first_name, ' ', e.last_name) as name,
                e.designation as role,
                (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id) as total_score,
                ev.status as evaluation_status,
                CASE 
                    WHEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id) >= 90 THEN 'Excellent'
                    WHEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id) >= 80 THEN 'Good'
                    WHEN (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id) >= 70 THEN 'Average'
                    ELSE 'Poor'
                END as performance_level
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            WHERE ev.cycle_team_assignment_id = ?
        `, [assignment_id]);

        res.json({
            success: true,
            team_info: {
                team_name: assignment.team_name,
                cycle_name: assignment.cycle_name,
                duration: `${assignment.start_date} to ${assignment.end_date}`
            },
            summary: {
                average_score: stats.avg_score ? parseFloat(stats.avg_score).toFixed(2) : 0,
                highest_score: stats.max_score || 0,
                lowest_score: stats.min_score || 0,
                completion_percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
            },
            employees: employees,
            status: stats.completed === stats.total ? 'finalized' : 'in-progress'
        });

    } catch (error) {
        console.error('Team Report Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 4. Individual Report (for Staff, Line Manager Self, Admin)
exports.getIndividualReport = async (req, res) => {
    try {
        const { evaluation_id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;
        const orgId = req.user.organizationId;

        // Fetch Evaluation with basic checks
        const [evalRows] = await db.query(`
            SELECT 
                COALESCE(ev.overall_score, (SELECT SUM((ed.score * pmx.weightage) / 100) FROM evaluation_details ed JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id WHERE ed.evaluation_id = ev.id AND pmx.matrix_id = cta.matrix_id)) as overall_score,
                ev.*,
                CONCAT(e.first_name, ' ', e.last_name) as employee_name,
                e.designation as Designation,
                e.user_id as employee_user_id,
                d.department_name as Department_name,
                t.team_name,
                ec.cycle_name,
                ec.start_date as cycle_start,
                ec.end_date as cycle_end,
                mgr_e.first_name as manager_name,
                o.organization_name,
                cta.matrix_id
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN teams t ON e.team_id = t.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
            JOIN employees mgr_e ON cta.line_manager_id = mgr_e.id
            JOIN organizations o ON ev.organization_id = o.id
            WHERE ev.id = ? AND ev.organization_id = ?
        `, [evaluation_id, orgId]);

        if (evalRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Evaluation not found' });
        }
        const evaluation = evalRows[0];

        // Access Control
        if (role === 'user') { // Staff
            if (evaluation.employee_user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this report' });
            }
        } else if (role === 'admin' || role === 'super_admin') {
            // Admin has full access within org
        } else {
            // Line manager check if they are the evaluator
            if (evaluation.evaluator_id !== userId && evaluation.employee_user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this report' });
            }
        }

        // Fetch Parameter Details
        const [details] = await db.query(`
            SELECT 
                p.parameter_name,
                p.description,
                pm.weightage,
                ed.score,
                (ed.score * pm.weightage / 100) as weighted_score,
                ed.comments as parameter_remarks
            FROM evaluation_details ed
            JOIN parameters p ON ed.parameter_id = p.id
            JOIN evaluations ev ON ed.evaluation_id = ev.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN parameter_matrices pm ON p.id = pm.parameter_id AND cta.matrix_id = pm.matrix_id
            WHERE ed.evaluation_id = ?
        `, [evaluation_id]);

        res.json({
            success: true,
            employee_details: {
                name: evaluation.employee_name,
                role: evaluation.Designation,
                department: evaluation.Department_name,
                team: evaluation.team_name
            },
            cycle_details: {
                name: evaluation.cycle_name,
                start: evaluation.cycle_start,
                end: evaluation.cycle_end,
                organization: evaluation.organization_name
            },
            performance: {
                overall_score: evaluation.overall_score,
                weighted_score: evaluation.weighted_score,
                status: evaluation.status,
                submitted_at: evaluation.submitted_at,
                manager_remarks: evaluation.comments,
                parameters: details
            }
        });

    } catch (error) {
        console.error('Individual Report Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
