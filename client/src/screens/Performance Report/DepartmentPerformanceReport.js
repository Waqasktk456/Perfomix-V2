import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid, PieChart, Pie, Legend } from "recharts";
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import '../../LineManager/screens/team-performance.css';
import '../Employees/Employees.css';

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
  const [paramData, setParamData] = useState([]);

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

        // Fetch parameter data for insights
        try {
          const paramRes = await axios.get(
            `http://localhost:5000/api/reports/department?dept_name=${encodeURIComponent(dept.dept_name)}&cycle_id=${dept.cycle_id}`,
            config
          );
          if (paramRes.data.success && paramRes.data.parameters?.length) {
            setParamData(paramRes.data.parameters);
          }
        } catch (e) { /* param optional */ }

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
            <h3>Completion Rate</h3>
            <div className="stat-value-large">
              {(() => {
                const total = teamChartData.reduce((sum, t) => sum + t.employeeCount, 0);
                const completed = teamChartData.reduce((sum, t) => sum + t.completedCount, 0);
                return total > 0 ? Math.round((completed / total) * 100) : 0;
              })()}%
            </div>
            <p className="stat-label">
              {teamChartData.reduce((sum, t) => sum + t.completedCount, 0)}/{teamChartData.reduce((sum, t) => sum + t.employeeCount, 0)} Evaluations
            </p>
          </div>
        </div>
      )}

      {/* Team Comparison Chart — only if more than 1 team */}
      {teamChartData.length > 1 && (
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
      )}

      {/* Performance Distribution Section */}
      {teamChartData.length > 0 && (() => {
        const allEmps = teamChartData.flatMap(t => t.rawEmployees || []);
        const completed = allEmps.filter(e => e.evaluation_status === 'Complete' || e.evaluation_status === 'completed');
        const total = completed.length;
        if (total === 0) return null;

        const excellent   = completed.filter(e => parseFloat(e.overall_weighted_score || 0) >= 80).length;
        const average     = completed.filter(e => { const s = parseFloat(e.overall_weighted_score || 0); return s >= 70 && s < 80; }).length;
        const attention   = completed.filter(e => parseFloat(e.overall_weighted_score || 0) < 70).length;

        const cats = [
          { name: 'Excellent',       count: excellent, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', pct: Math.round((excellent/total)*100) },
          { name: 'Average',         count: average,   color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', pct: Math.round((average/total)*100)   },
          { name: 'Needs Attention', count: attention, color: '#ef4444', bg: '#fef2f2', border: '#fecaca', pct: Math.round((attention/total)*100) },
        ];

        const dominant = [...cats].sort((a,b) => b.count - a.count)[0];

        const CustomDistTooltip = ({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0].payload;
          return (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: d.color }}>{d.name}</div>
              <div>Employees: <strong>{d.count}</strong></div>
              <div>Percentage: <strong>{d.pct}%</strong></div>
            </div>
          );
        };

        return (
          <div className="performers-section">
            <h2 className="section-title">Performance Distribution</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Employee distribution across performance categories
            </p>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
              {cats.map(c => (
                <div key={c.name} style={{ flex: 1, minWidth: 120, background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '22px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.count}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.color, marginTop: 2 }}>{c.pct}%</div>
                </div>
              ))}
            </div>

            {/* Donut chart */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie data={cats} dataKey="count" cx="50%" cy="50%" innerRadius={55} outerRadius={85}>
                    {cats.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip content={<CustomDistTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Insight panel */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', marginBottom: 10 }}>Key Insights</div>
                  <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>
                    → Most employees fall in: <strong style={{ color: dominant.color }}>{dominant.name}</strong> ({dominant.count} employees)
                  </div>
                  {attention > 0 && (
                    <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
                      → Risk Area: {attention} employee{attention > 1 ? 's' : ''} require{attention === 1 ? 's' : ''} improvement
                    </div>
                  )}
                  {attention === 0 && (
                    <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                      → All employees are performing at Average or above
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Parameter Insights Section */}
      {paramData.length > 0 && (() => {
        let chartData = [...paramData]
          .map(p => ({ name: p.name, score: parseFloat(p.avg_score || 0) }))
          .sort((a, b) => a.score - b.score);
        if (chartData.length > 8) chartData = chartData.slice(0, 5);
        const weakest  = chartData[0];
        const strongest = chartData[chartData.length - 1];
        return (
          <div className="performers-section" style={{ marginBottom: 8 }}>
            <h2 className="section-title">Parameter Performance Insights</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Average score per evaluation parameter across this department
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                ⚠ Weakest Area: {weakest.name} ({weakest.score}%)
              </div>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                ★ Strongest Area: {strongest.name} ({strongest.score}%)
              </div>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(420, chartData.length * 70 + 120)}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 8, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} angle={-45} textAnchor="end" interval={0} height={100} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={36}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === weakest.name ? '#ef4444' : entry.name === strongest.name ? '#10b981' : '#3b82f6'} />
                  ))}
                  <LabelList dataKey="score" position="top" formatter={v => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Teams Table */}
      <div className="members-section" style={{ marginTop: -35 }}>
        <h2 className="section-title">Teams in {dept.dept_name}</h2>
        <div className="table-container-scroll">
          <table className="report-table employees-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingLeft: 16, fontWeight: 700, color: '#1e3a5f', background: '#eaf1fb', borderBottom: '2px solid #c2d8f5' }}>Team Name</th>
                <th style={{ textAlign: 'center', fontWeight: 700, color: '#1e3a5f', background: '#eaf1fb', borderBottom: '2px solid #c2d8f5' }}>Employees</th>
                <th style={{ textAlign: 'center', fontWeight: 700, color: '#1e3a5f', background: '#eaf1fb', borderBottom: '2px solid #c2d8f5' }}>Completed</th>
                <th style={{ textAlign: 'center', fontWeight: 700, color: '#1e3a5f', background: '#eaf1fb', borderBottom: '2px solid #c2d8f5' }}>Pending</th>
                <th style={{ textAlign: 'center', fontWeight: 700, color: '#1e3a5f', background: '#eaf1fb', borderBottom: '2px solid #c2d8f5' }}>Avg Score</th>
                <th style={{ textAlign: 'center', fontWeight: 700, color: '#1e3a5f', background: '#eaf1fb', borderBottom: '2px solid #c2d8f5' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teamChartData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>No teams found</td>
                </tr>
              ) : (
                teamChartData.map((team, idx) => {
                  const goToTeam = () => {
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
                        _fromDeptReport: true,
                      }
                    });
                  };
                  return (
                    <tr
                      key={team.srNo}
                      onClick={goToTeam}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f4ff'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td style={{ fontWeight: 700, color: '#1e3a5f', textAlign: 'left', paddingLeft: 16 }}>{team.team}</td>
                      <td style={{ textAlign: 'center' }}>{team.employeeCount}</td>
                      <td style={{ textAlign: 'center' }}>{team.completedCount}</td>
                      <td style={{ textAlign: 'center' }}>{team.pendingCount}</td>
                      <td style={{ textAlign: 'center' }}>{team.score}</td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          title="View Performance"
                          onClick={goToTeam}
                          className="organization-icon-button action-btn-view"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DepartmentPerformanceReport;
