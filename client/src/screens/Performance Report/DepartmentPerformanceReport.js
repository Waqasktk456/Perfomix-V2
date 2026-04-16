import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid } from "recharts";
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import '../../LineManager/screens/team-performance.css';

const getBarColor = (score) => {
  if (score >= 80) return '#10b981'; // green
  if (score >= 60) return '#f59e0b'; // orange
  return '#ef4444';                  // red
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.team}</div>
      <div>Avg Score: <strong>{d.score}%</strong></div>
      <div>Completion Rate: <strong>{d.completedCount > 0 ? Math.round((d.completedCount / d.employeeCount) * 100) : 0}%</strong></div>
      <div>Total Members: <strong>{d.employeeCount}</strong></div>
    </div>
  );
};

const DepartmentPerformanceReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dept = location.state;

  const [loading, setLoading] = useState(true);
  const [deptStats, setDeptStats] = useState(null);
  const [teamChartData, setTeamChartData] = useState([]);

  useEffect(() => {
    if (!dept || !dept.dept_name) {
      toast.error("No department data found");
      navigate("/department-performance");
      return;
    }

    const fetchDeptPerformance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { toast.error("Session expired"); navigate("/login"); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const response = await axios.get(
          `http://localhost:5000/api/evaluations/all-status?cycle_id=${dept.cycle_id}`,
          config
        );

        const all = Array.isArray(response.data) ? response.data : response.data.data || [];
        const deptEmployees = all.filter(emp => emp.Department_name === dept.dept_name);

        const mapped = deptEmployees.map(emp => ({
          employee_id: emp.Employee_id,
          name: `${emp.First_name} ${emp.Last_name}`,
          designation: emp.Designation,
          email: emp.Email,
          profile_image: emp.Profile_image,
          status: emp.evaluation_status === "Complete" ? "completed" : "pending",
          progress: emp.evaluation_status === "Complete" ? 100 : 0,
          overall_score: emp.overall_weighted_score,
          evaluation_id: emp.id,
        }));

        // Build team comparison chart data + full team table data
        const teamMap = {};
        deptEmployees.forEach(emp => {
          const teamName = emp.Team_name || "Unknown";
          if (!teamMap[teamName]) teamMap[teamName] = { scores: [], employees: [], completed: 0 };
          teamMap[teamName].scores.push(Number(emp.overall_weighted_score) || 0);
          teamMap[teamName].employees.push(emp);
          if (emp.evaluation_status === "Complete") teamMap[teamName].completed++;
        });
        const chartData = Object.entries(teamMap)
          .map(([name, data], index) => ({
            srNo: index + 1,
            team: name,
            score: parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)),
            employeeCount: data.employees.length,
            completedCount: data.completed,
            pendingCount: data.employees.length - data.completed,
            rawEmployees: data.employees,
          }))
          .sort((a, b) => b.score - a.score)
          .map((item, index) => ({ ...item, srNo: index + 1 }));
        setTeamChartData(chartData);

        const completed = mapped.filter(e => e.status === "completed" && e.overall_score);
        const avgScore = mapped.length > 0
          ? mapped.reduce((sum, e) => sum + (Number(e.overall_score) || 0), 0) / mapped.length
          : 0;

        setDeptStats({ avgScore });
        setLoading(false);
      } catch (err) {
        toast.error("Failed to load department performance");
        setLoading(false);
      }
    };

    fetchDeptPerformance();
  }, [dept, navigate]);

  const handleExportReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `http://localhost:5000/api/reports/department?dept_name=${encodeURIComponent(dept.dept_name)}&cycle_id=${dept.cycle_id}`,
        config
      );
      if (response.data.success) {
        toast.info(`Generating report for ${dept.dept_name}...`);
        await generateProfessionalPDF(response.data, 'department-report');
        toast.success("Department report downloaded");
      } else {
        throw new Error(response.data.message || "Failed to fetch report data");
      }
    } catch (error) {
      toast.error("Failed to generate department report");
    }
  };

  if (loading) return <div className="loading-text">Loading department performance...</div>;
  if (!dept) return null;

  return (
    <div className="team-performance-container">
      {/* Header Row — same as AdminViewTeamsPerformance */}
      <div className="performance-header">
        <button className="back-btn" onClick={() => navigate("/department-performance")}>
          ← Back
        </button>
        <div className="header-content">
          <h1 className="team-title">{dept.dept_name}</h1>
          <p className="team-subtitle">{dept.cycle_name}</p>
        </div>
        <button className="export-btn" onClick={handleExportReport}>
          📊 Export Report
        </button>
      </div>

      {/* Stats */}
      {deptStats && (
        <div className="stats-grid">
          <div className="stat-card primary-stat">
            <h3>Average Score</h3>
            <div className="stat-value-large">{deptStats.avgScore ? deptStats.avgScore.toFixed(1) : "—"}</div>
            <p className="stat-label">Department Performance</p>
          </div>
          <div className="stat-card">
            <h3>Total Teams</h3>
            <div className="stat-value-large">{dept.team_count || 0}</div>
            <p className="stat-label">Teams in Department</p>
          </div>
          <div className="stat-card">
            <h3>Total Employees</h3>
            <div className="stat-value-large">{teamChartData.reduce((sum, t) => sum + t.employeeCount, 0)}</div>
            <p className="stat-label">In this department</p>
          </div>
          <div className="stat-card">
            <h3>Last Activity</h3>
            <div className="stat-value-medium">
              {teamChartData.reduce((sum, t) => sum + t.completedCount, 0) > 0 ? "Recent" : "No activity yet"}
            </div>
            <p className="stat-label">Most Recent Update</p>
          </div>
        </div>
      )}

      {/* Team Comparison Chart */}
      <div className="performers-section">
        <h2 className="section-title">Team Performance Comparison</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
          Comparison of team performance within this department
        </p>

        {teamChartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>
            No team data available
          </div>
        ) : (
          <>
            {/* Insight bar */}
            {(() => {
              const best = teamChartData[0];
              const worst = teamChartData[teamChartData.length - 1];
              const gap = best && worst ? (best.score - worst.score).toFixed(1) : 0;
              const noHighPerformer = teamChartData.every(t => t.score < 80);
              return (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#334155' }}>
                  {noHighPerformer
                    ? <span>⚠ No high-performing teams (≥80%) in this cycle.</span>
                    : best && worst && best.team !== worst.team
                      ? <span>📊 <strong>{best.team}</strong> leads with <strong>{best.score}%</strong>, while <strong>{worst.team}</strong> lags at <strong>{worst.score}%</strong> — a gap of <strong>{gap}%</strong>.</span>
                      : <span>📊 <strong>{best?.team}</strong> is the only team with <strong>{best?.score}%</strong>.</span>
                  }
                </div>
              );
            })()}

            <ResponsiveContainer width="100%" height={Math.max(260, teamChartData.length * 58)}>
              <BarChart
                data={teamChartData}
                layout="vertical"
                margin={{ top: 10, right: 70, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="team" width={140} tick={{ fontSize: 13, fontWeight: 500 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={30}>
                  {teamChartData.map((entry, index) => (
                    <Cell key={index} fill={getBarColor(entry.score)} />
                  ))}
                  <LabelList dataKey="score" position="right" formatter={v => `${v}%`} style={{ fontSize: 13, fontWeight: 700, fill: '#1e293b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: '#475569' }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#10b981', borderRadius: 2, marginRight: 5 }}></span>High Performing (≥80%)</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#f59e0b', borderRadius: 2, marginRight: 5 }}></span>Average (60–79%)</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', borderRadius: 2, marginRight: 5 }}></span>Needs Attention (&lt;60%)</span>
            </div>
          </>
        )}
      </div>

      {/* Teams Table */}
      <div className="members-section">
        <h2 className="section-title">Teams in {dept.dept_name}</h2>
        <div className="table-container-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>SR NO</th>
                <th>Team Name</th>
                <th>Employees</th>
                <th>Completed</th>
                <th>Pending</th>
                <th>Avg Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {teamChartData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px" }}>No teams found</td>
                </tr>
              ) : (
                teamChartData.map((team) => (
                  <tr key={team.srNo}>
                    <td>{team.srNo}</td>
                    <td>{team.team}</td>
                    <td>{team.employeeCount}</td>
                    <td>{team.completedCount}</td>
                    <td>{team.pendingCount}</td>
                    <td>{team.score}</td>
                    <td
                      className="action-view"
                      onClick={() => {
                        const teamEmployees = team.rawEmployees.map(emp => ({
                          employee_id: emp.Employee_id,
                          name: `${emp.First_name} ${emp.Last_name}`,
                          designation: emp.Designation,
                          email: emp.Email,
                          profile_image: emp.Profile_image,
                          status: emp.evaluation_status === "Complete" ? "completed" : "pending",
                          progress: emp.evaluation_status === "Complete" ? 100 : 0,
                          overall_score: emp.overall_weighted_score,
                          evaluation_id: emp.id,
                          total_params: 0,
                        }));
                        navigate("/adminview-teams-performance", {
                          state: {
                            team_name: team.team,
                            team_id: team.srNo,
                            assignment_id: team.srNo,
                            department_name: dept.dept_name,
                            employee_count: team.employeeCount,
                            completed_evaluations: team.completedCount,
                            pending_evaluations: team.pendingCount,
                            avg_performance_score: team.score,
                            matrix_name: "Performance Matrix",
                            cycle_name: dept.cycle_name,
                            employees: teamEmployees,
                          }
                        });
                      }}
                    >
                      View
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentPerformanceReport;
