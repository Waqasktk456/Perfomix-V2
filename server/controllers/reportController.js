const db = require('../config/db');

// Helper to get organization info
const getOrgInfo = async (orgId) => {
    const [rows] = await db.query('SELECT organization_name FROM organizations WHERE id = ?', [orgId]);
    return rows[0] || { organization_name: 'Perfomix' };
};

// 1. Admin - Organization Overall Summary
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

        // Summary Statistics (Expanded)
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(*) as total_evaluations,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status != 'completed' THEN 1 END) as pending_count,
                AVG(CASE WHEN status = 'completed' THEN overall_score END) as avg_score,
                MAX(CASE WHEN status = 'completed' THEN overall_score END) as highest_score,
                MIN(CASE WHEN status = 'completed' THEN overall_score END) as lowest_score
            FROM evaluations 
            WHERE organization_id = ? AND cycle_team_assignment_id IN (
                SELECT id FROM cycle_team_assignments WHERE cycle_id = ?
            )
        `, [orgId, cycle_id]);

        const stats = statsRows[0];

        // Top Performers (Expanded)
        const [topPerformers] = await db.query(`
            SELECT e.first_name as First_name, e.last_name as Last_name, 
                ev.overall_score, 
                e.designation as Designation,
                d.department_name
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE ev.organization_id = ? AND ev.status = 'completed' 
            AND ev.cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            ORDER BY overall_score DESC
            LIMIT 10
        `, [orgId, cycle_id]);

        // Employees Requiring Improvement
        const [improvementNeeded] = await db.query(`
            SELECT e.first_name as First_name, e.last_name as Last_name, 
                ev.overall_score, 
                e.designation as Designation,
                d.department_name
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE ev.organization_id = ? AND ev.status = 'completed' 
            AND ev.overall_score < 70
            AND ev.cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            ORDER BY overall_score ASC
        `, [orgId, cycle_id]);

        // Performance Distribution
        const [distribution] = await db.query(`
            SELECT 
                CASE 
                    WHEN overall_score >= 85 THEN 'Excellent'
                    WHEN overall_score >= 70 THEN 'Good'
                    WHEN overall_score >= 50 THEN 'Satisfactory'
                    ELSE 'Needs Improvement'
                END as level,
                COUNT(*) as count
            FROM evaluations
            WHERE organization_id = ? AND status = 'completed'
            AND cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            GROUP BY level
        `, [orgId, cycle_id]);

        // Department-wise Statistics
        const [deptStats] = await db.query(`
            SELECT d.department_name as Department_name, 
                COUNT(ev.id) as emp_count,
                AVG(ev.overall_score) as avg_score,
                MAX(ev.overall_score) as max_score,
                MIN(ev.overall_score) as min_score
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            JOIN departments d ON e.department_id = d.id
            WHERE ev.organization_id = ? AND ev.status = 'completed'
            AND ev.cycle_team_assignment_id IN (SELECT id FROM cycle_team_assignments WHERE cycle_id = ?)
            GROUP BY d.department_name
        `, [orgId, cycle_id]);

        // Line Manager Completion Summary
        const [managerStats] = await db.query(`
            SELECT 
                CONCAT(m.first_name, ' ', m.last_name) as manager_name,
                COUNT(ev.id) as total_assigned,
                COUNT(CASE WHEN ev.status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN ev.status != 'completed' THEN 1 END) as pending
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN employees m ON cta.line_manager_id = m.id
            WHERE ev.organization_id = ?
            AND cta.cycle_id = ?
            GROUP BY m.id, m.first_name, m.last_name
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
                average_score: stats.avg_score ? parseFloat(stats.avg_score).toFixed(2) : 0,
                highest_score: stats.highest_score || 0,
                lowest_score: stats.lowest_score || 0
            },
            top_performers: topPerformers,
            improvement_needed: improvementNeeded,
            distribution: distribution,
            dept_stats: deptStats,
            manager_stats: managerStats
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

// 3. Line Manager - Team Performance Report (Enhanced)
exports.getTeamReport = async (req, res) => {
    try {
        const { assignment_id } = req.query;
        const managerId = req.user.id;
        const orgId = req.user.organizationId;

        // Verify assignment
        let assignmentQuery = `
            SELECT cta.*, t.team_name, t.department_id,
                   ec.cycle_name, ec.start_date, ec.end_date, ec.id as cycle_id,
                   ec.organization_id,
                   d.department_name,
                   CONCAT(mgr.first_name, ' ', mgr.last_name) as manager_name,
                   (SELECT organization_name FROM organizations WHERE id = ec.organization_id LIMIT 1) as organization_name
            FROM cycle_team_assignments cta
            JOIN teams t ON cta.team_id = t.id
            JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
            LEFT JOIN departments d ON t.department_id = d.id
            JOIN employees mgr ON cta.line_manager_id = mgr.id
            WHERE cta.id = ?
        `;
        const assignmentParams = [assignment_id];
        if (req.user.role?.toLowerCase() !== 'admin' && req.user.role?.toLowerCase() !== 'super_admin') {
            assignmentQuery += " AND cta.line_manager_id = ? AND ec.organization_id = ?";
            assignmentParams.push(managerId, orgId);
        }
        const [assignmentRows] = await db.query(assignmentQuery, assignmentParams);
        console.log('[TeamReport] assignment_id:', assignment_id, 'role:', req.user.role, 'orgId:', orgId, 'rows:', assignmentRows.length);

        // If still 0 rows, try a simpler query to debug
        if (assignmentRows.length === 0) {
            const [debugRows] = await db.query(
                `SELECT cta.id, cta.team_id, cta.line_manager_id, t.team_name, ec.cycle_name
                 FROM cycle_team_assignments cta
                 JOIN teams t ON cta.team_id = t.id
                 JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
                 WHERE cta.id = ?`,
                [assignment_id]
            );
            console.log('[TeamReport] Debug simple query rows:', debugRows.length, debugRows[0]);
            if (debugRows.length === 0) {
                return res.status(403).json({ success: false, message: 'Assignment not found' });
            }
            // Assignment exists but JOIN on employees failed — use fallback
            const a = debugRows[0];
            return res.json({
                success: true,
                team_info: { team_name: a.team_name, cycle_name: a.cycle_name, department: 'N/A', manager_name: 'N/A', duration: 'N/A', organization: 'N/A' },
                summary: { average_score: 0, total_members: 0, completed: 0, pending: 0, completion_percentage: 0 },
                trend: null, distribution: {}, parameters: [], employees: [],
                benchmarking: {}, risks: [], recommendations: [], status: 'in-progress'
            });
        }
        const assignment = assignmentRows[0];

        // Team Summary Stats
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                AVG(CASE WHEN status = 'completed' THEN overall_score END) as avg_score,
                MAX(CASE WHEN status = 'completed' THEN overall_score END) as max_score,
                MIN(CASE WHEN status = 'completed' THEN overall_score END) as min_score
            FROM evaluations WHERE cycle_team_assignment_id = ?
        `, [assignment_id]);
        const stats = statsRows[0];
        const avgScore = stats.avg_score ? parseFloat(stats.avg_score) : 0;

        // Employee List with scores
        const [employees] = await db.query(`
            SELECT 
                ev.id as evaluation_id,
                CONCAT(e.first_name, ' ', e.last_name) as name,
                e.designation as role,
                ev.overall_score as total_score,
                ev.status as evaluation_status,
                ev.rating_name as performance_level
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            WHERE ev.cycle_team_assignment_id = ?
            ORDER BY ev.overall_score DESC
        `, [assignment_id]);

        // Performance Distribution
        const distribution = { Excellent: 0, Good: 0, Average: 0, Poor: 0 };
        employees.forEach(emp => {
            const s = parseFloat(emp.total_score || 0);
            if (s >= 90) distribution.Excellent++;
            else if (s >= 75) distribution.Good++;
            else if (s >= 60) distribution.Average++;
            else distribution.Poor++;
        });

        // Parameter-level team analysis
        const [paramStats] = await db.query(`
            SELECT p.parameter_name,
                   AVG(ed.score) as avg_score,
                   pm.weightage
            FROM evaluation_details ed
            JOIN parameters p ON ed.parameter_id = p.id
            JOIN evaluations ev ON ed.evaluation_id = ev.id
            JOIN parameter_matrices pm ON ed.parameter_id = pm.parameter_id AND pm.matrix_id = ?
            WHERE ev.cycle_team_assignment_id = ? AND ev.status = 'completed'
            GROUP BY p.id, p.parameter_name, pm.weightage
            ORDER BY avg_score DESC
        `, [assignment.matrix_id, assignment_id]);

        // Benchmark: dept avg and org avg for this cycle
        const [deptAvgRow] = await db.query(`
            SELECT AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            WHERE e.department_id = ? AND ev.status = 'completed'
              AND ev.cycle_id = ?
        `, [assignment.department_id, assignment.cycle_id]);

        const [orgAvgRow] = await db.query(`
            SELECT AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            WHERE ev.organization_id = ? AND ev.status = 'completed'
              AND ev.cycle_id = ?
        `, [orgId, assignment.cycle_id]);

        // Team rank among all teams in this cycle
        const [teamRankRows] = await db.query(`
            SELECT cta.id, AVG(ev.overall_score) as team_avg
            FROM cycle_team_assignments cta
            JOIN evaluations ev ON ev.cycle_team_assignment_id = cta.id
            WHERE cta.cycle_id = ? AND ev.status = 'completed'
            GROUP BY cta.id
            ORDER BY team_avg DESC
        `, [assignment.cycle_id]);
        const rankIndex = teamRankRows.findIndex(r => r.id == assignment_id);
        const teamRank = rankIndex >= 0 ? rankIndex + 1 : null;
        const totalTeams = teamRankRows.length;

        // Previous cycle trend
        const [prevCycleRow] = await db.query(`
            SELECT ec.cycle_name, AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
            WHERE cta.team_id = ? AND ev.status = 'completed'
              AND ec.end_date < ? AND cta.id != ?
            GROUP BY ec.id
            ORDER BY ec.end_date DESC
            LIMIT 1
        `, [assignment.team_id, assignment.start_date, assignment_id]);
        const prevCycle = prevCycleRow[0] || null;

        // Risk detection
        const risks = [];
        const lowPerformers = employees.filter(e => parseFloat(e.total_score || 0) < 60);
        if (lowPerformers.length > 0) risks.push(`${lowPerformers.length} employee(s) performing below 60% — high risk`);
        if (paramStats.length > 0) {
            const weakParam = paramStats[paramStats.length - 1];
            if (parseFloat(weakParam.avg_score) < 65) risks.push(`${weakParam.parameter_name} score consistently low across team (${parseFloat(weakParam.avg_score).toFixed(0)}%)`);
        }
        if (prevCycle && avgScore < parseFloat(prevCycle.avg_score)) {
            risks.push(`Performance declined by ${(parseFloat(prevCycle.avg_score) - avgScore).toFixed(1)}% from last cycle`);
        }
        const scores = employees.map(e => parseFloat(e.total_score || 0)).filter(s => s > 0);
        if (scores.length > 1) {
            const variance = Math.max(...scores) - Math.min(...scores);
            if (variance > 30) risks.push(`High score variance (${variance.toFixed(0)} points) between team members`);
        }

        // Recommendations
        const recommendations = [];
        if (paramStats.length > 0) {
            const weakParam = paramStats[paramStats.length - 1];
            recommendations.push(`Conduct ${weakParam.parameter_name} improvement workshop for the team`);
        }
        if (lowPerformers.length > 0) recommendations.push(`Create individual improvement plans for ${lowPerformers.length} underperforming employee(s)`);
        if (avgScore >= 80) recommendations.push('Recognize top performers in the next team meeting');
        recommendations.push('Assign mentorship roles: pair top performers with average performers');

        res.json({
            success: true,
            team_info: {
                team_name: assignment.team_name,
                department: assignment.department_name,
                manager_name: assignment.manager_name,
                cycle_name: assignment.cycle_name,
                start_date: assignment.start_date,
                end_date: assignment.end_date,
                organization: assignment.organization_name,
                duration: `${new Date(assignment.start_date).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'})} – ${new Date(assignment.end_date).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'})}`
            },
            summary: {
                average_score: parseFloat(avgScore.toFixed(1)),
                highest_score: parseFloat(stats.max_score || 0).toFixed(1),
                lowest_score: parseFloat(stats.min_score || 0).toFixed(1),
                total_members: parseInt(stats.total),
                completed: parseInt(stats.completed),
                pending: parseInt(stats.total) - parseInt(stats.completed),
                completion_percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
                team_rank: teamRank,
                total_teams: totalTeams
            },
            trend: prevCycle ? {
                previous_cycle: prevCycle.cycle_name,
                previous_score: parseFloat(prevCycle.avg_score).toFixed(1),
                change: (avgScore - parseFloat(prevCycle.avg_score)).toFixed(1)
            } : null,
            distribution,
            parameters: paramStats.map(p => ({
                name: p.parameter_name,
                avg_score: parseFloat(p.avg_score).toFixed(1),
                weightage: p.weightage
            })),
            employees,
            benchmarking: {
                team_avg: parseFloat(avgScore.toFixed(1)),
                dept_avg: deptAvgRow[0]?.avg_score ? parseFloat(Number(deptAvgRow[0].avg_score).toFixed(1)) : null,
                org_avg: orgAvgRow[0]?.avg_score ? parseFloat(Number(orgAvgRow[0].avg_score).toFixed(1)) : null
            },
            risks,
            recommendations,
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
        // Note: For staff/line-manager, JWT id = employees.id (not users.id)
        if (role === 'user' || role?.toLowerCase() === 'staff') {
            if (evaluation.employee_id !== userId) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this report' });
            }
        } else if (role === 'admin' || role === 'super_admin') {
            // Admin has full access within org
        }
        // Line managers can view any report in their org — no restriction needed

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

        // Fetch Previous Evaluation (for comparison)
        const [prevEvalRows] = await db.query(`
            SELECT 
                ev.overall_score,
                ec.cycle_name
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
            WHERE ev.employee_id = ? 
            AND ev.status = 'completed'
            AND ec.end_date < ?
            ORDER BY ec.end_date DESC
            LIMIT 1
        `, [evaluation.employee_id, evaluation.cycle_start]);

        const previousPerformance = prevEvalRows.length > 0 ? prevEvalRows[0] : null;

        // Fetch AI analysis results
        const [aiRows] = await db.query(
            `SELECT ai_summary, ai_sentiment, ai_flags FROM evaluations WHERE id = ?`,
            [evaluation_id]
        );
        const aiData = aiRows[0] || {};
        let aiFlags = [];
        try { aiFlags = aiData.ai_flags ? (typeof aiData.ai_flags === 'string' ? JSON.parse(aiData.ai_flags) : aiData.ai_flags) : []; } catch(e) {}

        // Fetch benchmarking data
        const [teamBench] = await db.query(`
            SELECT AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE cta.team_id = (SELECT team_id FROM cycle_team_assignments WHERE id = ?)
              AND ev.status = 'completed' AND cta.cycle_id = (SELECT cycle_id FROM cycle_team_assignments WHERE id = ?)
        `, [evaluation.cycle_team_assignment_id, evaluation.cycle_team_assignment_id]);

        const [deptBench] = await db.query(`
            SELECT AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE e.department_id = (SELECT department_id FROM employees WHERE id = ?)
              AND ev.status = 'completed' AND cta.cycle_id = (SELECT cycle_id FROM cycle_team_assignments WHERE id = ?)
        `, [evaluation.employee_id, evaluation.cycle_team_assignment_id]);

        const [orgBench] = await db.query(`
            SELECT AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE ev.organization_id = ? AND ev.status = 'completed'
              AND cta.cycle_id = (SELECT cycle_id FROM cycle_team_assignments WHERE id = ?)
        `, [orgId, evaluation.cycle_team_assignment_id]);

        const [percentileRow] = await db.query(`
            SELECT COUNT(*) as employees_below
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE ev.organization_id = ? AND ev.status = 'completed'
              AND cta.cycle_id = (SELECT cycle_id FROM cycle_team_assignments WHERE id = ?)
              AND ev.overall_score < ?
        `, [orgId, evaluation.cycle_team_assignment_id, evaluation.overall_score]);

        const [totalRow] = await db.query(`
            SELECT COUNT(*) as total
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE ev.organization_id = ? AND ev.status = 'completed'
              AND cta.cycle_id = (SELECT cycle_id FROM cycle_team_assignments WHERE id = ?)
        `, [orgId, evaluation.cycle_team_assignment_id]);

        const percentile = totalRow[0].total > 0
            ? Math.round((percentileRow[0].employees_below / totalRow[0].total) * 100)
            : null;

        // Also fetch rating and recommendation fields from evaluation_details
        const [detailsFull] = await db.query(`
            SELECT 
                p.id as parameter_id,
                p.parameter_name,
                p.description,
                pm.weightage,
                ed.rating,
                ed.score,
                (ed.score * pm.weightage / 100) as weighted_score,
                ed.comments as feedback,
                ed.recommendation
            FROM evaluation_details ed
            JOIN parameters p ON ed.parameter_id = p.id
            JOIN evaluations ev ON ed.evaluation_id = ev.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN parameter_matrices pm ON p.id = pm.parameter_id AND cta.matrix_id = pm.matrix_id
            WHERE ed.evaluation_id = ?
        `, [evaluation_id]);

        // Generate final verdict
        const score = parseFloat(evaluation.overall_score || 0);
        let verdict, verdictColor;
        if (score >= 90) { verdict = 'Ready for Promotion'; verdictColor = '#10B981'; }
        else if (score >= 75) { verdict = 'Exceeds Expectations'; verdictColor = '#3B82F6'; }
        else if (score >= 60) { verdict = 'Meets Expectations'; verdictColor = '#F59E0B'; }
        else if (score >= 45) { verdict = 'Needs Improvement'; verdictColor = '#F97316'; }
        else { verdict = 'Performance Support Required'; verdictColor = '#EF4444'; }

        res.json({
            success: true,
            employee_details: {
                id: evaluation.employee_id,
                name: evaluation.employee_name,
                role: evaluation.Designation,
                department: evaluation.Department_name,
                team: evaluation.team_name,
            },
            cycle_details: {
                name: evaluation.cycle_name,
                start: evaluation.cycle_start,
                end: evaluation.cycle_end,
                organization: evaluation.organization_name,
                status: 'Closed'
            },
            performance: {
                overall_score: evaluation.overall_score,
                weighted_score: Number(evaluation.overall_score),
                rating_name: evaluation.rating_name,
                status: evaluation.status,
                submitted_at: evaluation.submitted_at || evaluation.updated_at,
                manager_remarks: evaluation.comments,
                evaluator_name: evaluation.manager_name,
                parameters: detailsFull,
                previous_score: previousPerformance ? previousPerformance.overall_score : null,
                previous_cycle: previousPerformance ? previousPerformance.cycle_name : null
            },
            ai: {
                summary: aiData.ai_summary || null,
                sentiment: aiData.ai_sentiment || null,
                flags: aiFlags
            },
            benchmarking: {
                team_average: teamBench[0]?.avg_score ? parseFloat(Number(teamBench[0].avg_score).toFixed(1)) : null,
                dept_average: deptBench[0]?.avg_score ? parseFloat(Number(deptBench[0].avg_score).toFixed(1)) : null,
                org_average: orgBench[0]?.avg_score ? parseFloat(Number(orgBench[0].avg_score).toFixed(1)) : null,
                percentile_rank: percentile
            },
            verdict: {
                label: verdict,
                color: verdictColor,
                score: score
            }
        });

    } catch (error) {
        console.error('Individual Report Error:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Internal server error', detail: error.message });
    }
};

// 5. Department Performance Report
exports.getDepartmentReport = async (req, res) => {
    try {
        const { dept_name, cycle_id } = req.query;
        const orgId = req.user.organizationId;

        if (!dept_name || !cycle_id) {
            return res.status(400).json({ success: false, message: 'dept_name and cycle_id are required' });
        }

        // Get cycle info
        const [cycleRows] = await db.query(
            `SELECT cycle_name, start_date, end_date FROM evaluation_cycles WHERE id = ? AND organization_id = ?`,
            [cycle_id, orgId]
        );
        if (cycleRows.length === 0) return res.status(404).json({ success: false, message: 'Cycle not found' });
        const cycle = cycleRows[0];

        // Get department id
        const [deptRows] = await db.query(
            `SELECT id FROM departments WHERE department_name = ? AND organization_id = ?`,
            [dept_name, orgId]
        );
        if (deptRows.length === 0) return res.status(404).json({ success: false, message: 'Department not found' });
        const deptId = deptRows[0].id;

        // All evaluations in this dept + cycle
        // Employees linked to teams via team_members junction table
        const [evalRows] = await db.query(`
            SELECT ev.overall_score, ev.status, ev.rating_name,
                   e.id as employee_id,
                   CONCAT(e.first_name, ' ', e.last_name) as emp_name,
                   t.id as team_id, t.team_name,
                   cta.id as assignment_id,
                   CONCAT(mgr.first_name, ' ', mgr.last_name) as manager_name
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            JOIN team_members tm ON e.id = tm.employee_id
            JOIN teams t ON tm.team_id = t.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id AND cta.team_id = t.id
            JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
            JOIN employees mgr ON cta.line_manager_id = mgr.id
            WHERE e.department_id = ? AND cta.cycle_id = ? AND ev.organization_id = ?
        `, [deptId, cycle_id, orgId]);

        const totalEmployees = evalRows.length;
        const completed = evalRows.filter(r => r.status === 'completed');
        const completedCount = completed.length;
        const avgScore = completedCount > 0
            ? parseFloat((completed.reduce((s, r) => s + parseFloat(r.overall_score || 0), 0) / completedCount).toFixed(1))
            : 0;
        const completionRate = totalEmployees > 0 ? Math.round((completedCount / totalEmployees) * 100) : 0;

        // Score distribution
        const distribution = { Excellent: 0, 'Very Good': 0, Good: 0, 'Needs Attention': 0 };
        completed.forEach(r => {
            const s = parseFloat(r.overall_score || 0);
            if (s >= 90) distribution['Excellent']++;
            else if (s >= 80) distribution['Very Good']++;
            else if (s >= 70) distribution['Good']++;
            else distribution['Needs Attention']++;
        });

        // Team comparison
        const teamMap = {};
        evalRows.forEach(r => {
            if (!teamMap[r.team_id]) teamMap[r.team_id] = { name: r.team_name, scores: [], total: 0, completed: 0, manager: r.manager_name, assignment_id: r.assignment_id };
            teamMap[r.team_id].total++;
            if (r.status === 'completed') {
                teamMap[r.team_id].scores.push(parseFloat(r.overall_score || 0));
                teamMap[r.team_id].completed++;
            }
        });
        const teams = Object.values(teamMap).map(t => ({
            name: t.name,
            avg_score: t.scores.length > 0 ? parseFloat((t.scores.reduce((a, b) => a + b, 0) / t.scores.length).toFixed(1)) : 0,
            members: t.total,
            completed: t.completed,
            completion_rate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
            manager: t.manager,
            assignment_id: t.assignment_id
        })).sort((a, b) => b.avg_score - a.avg_score);

        const topTeam = teams.find(t => t.avg_score >= 80) || null;
        const bottomTeam = teams.slice().reverse().find(t => t.avg_score > 0 && t.avg_score < 60) || null;

        // Parameter-level analysis
        const [paramRows] = await db.query(`
            SELECT p.parameter_name, AVG(ed.score) as avg_score
            FROM evaluation_details ed
            JOIN parameters p ON ed.parameter_id = p.id
            JOIN evaluations ev ON ed.evaluation_id = ev.id
            JOIN employees e ON ev.employee_id = e.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE e.department_id = ? AND cta.cycle_id = ? AND ev.status = 'completed'
            GROUP BY p.id, p.parameter_name
            ORDER BY avg_score DESC
        `, [deptId, cycle_id]);

        // Org average for benchmark
        const [orgAvgRow] = await db.query(`
            SELECT AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE ev.organization_id = ? AND ev.status = 'completed' AND cta.cycle_id = ?
        `, [orgId, cycle_id]);
        const orgAvg = orgAvgRow[0]?.avg_score ? parseFloat(Number(orgAvgRow[0].avg_score).toFixed(1)) : null;

        // Dept rank among all departments
        const [deptRankRows] = await db.query(`
            SELECT e.department_id, AVG(ev.overall_score) as dept_avg
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            WHERE ev.organization_id = ? AND ev.status = 'completed' AND cta.cycle_id = ?
            GROUP BY e.department_id
            ORDER BY dept_avg DESC
        `, [orgId, cycle_id]);
        const rankIdx = deptRankRows.findIndex(r => r.department_id === deptId);
        const deptRank = rankIdx >= 0 ? rankIdx + 1 : null;
        const totalDepts = deptRankRows.length;

        // Previous cycle trend
        const [prevRow] = await db.query(`
            SELECT ec.cycle_name, AVG(ev.overall_score) as avg_score
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
            JOIN evaluation_cycles ec ON cta.cycle_id = ec.id
            WHERE e.department_id = ? AND ev.status = 'completed'
              AND ec.end_date < ? AND cta.cycle_id != ?
            GROUP BY ec.id ORDER BY ec.end_date DESC LIMIT 1
        `, [deptId, cycle.start_date, cycle_id]);
        const prevCycle = prevRow[0] || null;
        const trendChange = prevCycle ? parseFloat((avgScore - parseFloat(prevCycle.avg_score)).toFixed(1)) : null;

        // Risk detection
        const risks = [];
        const lowTeams = teams.filter(t => t.avg_score > 0 && t.avg_score < 60);
        if (lowTeams.length > 0) risks.push(`${lowTeams.map(t => t.name).join(', ')} below acceptable threshold (<60%)`);
        if (teams.length >= 2) {
            const variance = teams[0].avg_score - teams[teams.length - 1].avg_score;
            if (variance > 20) risks.push(`High performance gap between teams (${variance.toFixed(0)}% variance)`);
        }
        const lowCompTeams = teams.filter(t => t.completion_rate < 70);
        if (lowCompTeams.length > 0) risks.push(`Low completion rate in: ${lowCompTeams.map(t => t.name).join(', ')}`);
        if (trendChange !== null && trendChange < -5) risks.push(`Significant performance decline of ${Math.abs(trendChange)}% from last cycle`);
        const needsAttentionCount = distribution['Needs Attention'];
        if (needsAttentionCount > 0) risks.push(`${needsAttentionCount} employee(s) performing below 70%`);

        // Recommendations
        const recommendations = [];
        if (paramRows.length > 0) {
            const weakParam = paramRows[paramRows.length - 1];
            if (parseFloat(weakParam.avg_score) < 75) recommendations.push(`Organize a department-wide ${weakParam.parameter_name} improvement workshop`);
        }
        if (bottomTeam && bottomTeam.avg_score < 70) recommendations.push(`Provide immediate support and resources to ${bottomTeam.name} team`);
        if (topTeam) recommendations.push(`Share best practices from ${topTeam.name} team across the department`);
        if (needsAttentionCount > 0) recommendations.push(`Conduct 1:1 performance improvement discussions with ${needsAttentionCount} underperforming employee(s)`);
        if (trendChange !== null && trendChange < 0) recommendations.push('Investigate root causes of performance decline and address in next cycle');
        recommendations.push('Monitor weakest parameter closely in the next evaluation cycle');

        res.json({
            success: true,
            dept_info: {
                dept_name,
                cycle_name: cycle.cycle_name,
                start_date: cycle.start_date,
                end_date: cycle.end_date,
                total_teams: teams.length,
                total_employees: totalEmployees,
                dept_rank: deptRank,
                total_depts: totalDepts
            },
            summary: {
                avg_score: avgScore,
                completed: completedCount,
                total: totalEmployees,
                completion_rate: completionRate,
                trend_change: trendChange,
                prev_cycle_name: prevCycle?.cycle_name || null,
                prev_cycle_score: prevCycle ? parseFloat(Number(prevCycle.avg_score).toFixed(1)) : null
            },
            distribution,
            teams,
            top_team: topTeam,
            bottom_team: bottomTeam,
            parameters: paramRows.map(p => ({ name: p.parameter_name, avg_score: parseFloat(Number(p.avg_score).toFixed(1)) })),
            benchmarking: { dept_avg: avgScore, org_avg: orgAvg },
            risks,
            recommendations
        });

    } catch (error) {
        console.error('Department Report Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error', detail: error.message });
    }
};
