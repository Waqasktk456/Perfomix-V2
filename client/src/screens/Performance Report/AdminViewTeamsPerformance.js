import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';
import '../../LineManager/screens/team-performance.css';

const AdminViewTeamsPerformance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const team = location.state;

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState(null);
  const [paramData, setParamData] = useState([]);

  useEffect(() => {
    if (!team) {
      toast.error("No team data found");
      navigate("/team-performance");
      return;
    }

    const fetchTeamPerformance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Session expired");
          navigate("/login");
          return;
        }

        if (team.employees && Array.isArray(team.employees)) {
          setEmployees(team.employees);

          let topPerformer = null;
          let lowPerformer = null;
          const completedEmployees = team.employees.filter(emp => emp.status === 'completed' && emp.overall_score);

          if (completedEmployees.length > 0) {
            const sorted = completedEmployees.sort((a, b) => Number(b.overall_score) - Number(a.overall_score));
            topPerformer = { name: sorted[0].name, score: sorted[0].overall_score, designation: sorted[0].designation || "N/A" };
            lowPerformer = { name: sorted[sorted.length - 1].name, score: sorted[sorted.length - 1].overall_score, designation: sorted[sorted.length - 1].designation || "N/A" };
          }

          setTeamStats({ topPerformer, lowPerformer, lastActivity: team.last_activity || null, avgScore: Number(team.avg_performance_score) || 0 });

          // Fetch parameter data for chart
          if (team.assignment_id) {
            try {
              const token = localStorage.getItem('token');
              const res = await axios.get(`http://localhost:5000/api/reports/team?assignment_id=${team.assignment_id}`, { headers: { Authorization: `Bearer ${token}` } });
              if (res.data.success && res.data.parameters?.length) setParamData(res.data.parameters);
            } catch (e) {}
          }

          setLoading(false);
          return;
        }

        const assignmentId = team.assignment_id || team.team_id;
        if (!assignmentId) {
          toast.error("Invalid team data");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/api/line-manager/team-employees/${assignmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.data.success) throw new Error("Failed to load team data");

        setEmployees(response.data.employees || []);

        let topPerformer = null;
        let lowPerformer = null;
        if (team.top_performer?.name) topPerformer = { name: team.top_performer.name, score: team.top_performer.score, designation: team.top_performer.designation || "N/A" };
        if (team.low_performer?.name) lowPerformer = { name: team.low_performer.name, score: team.low_performer.score, designation: team.low_performer.designation || "N/A" };

        setTeamStats({ topPerformer, lowPerformer, lastActivity: team.last_activity || null, avgScore: Number(team.avg_performance_score) || 0 });

        // Fetch parameter data for chart
        try {
          const res = await axios.get(`http://localhost:5000/api/reports/team?assignment_id=${assignmentId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.success && res.data.parameters?.length) setParamData(res.data.parameters);
        } catch (e) {}

        setLoading(false);
      } catch (err) {
        toast.error("Failed to load team performance: " + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };

    fetchTeamPerformance();
  }, [team, navigate]);

  const formatLastActivity = (dateString) => {
    if (!dateString) return "No activity yet";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { text: "Completed", className: "status-completed" },
      draft: { text: "In Progress", className: "status-draft" },
      pending: { text: "Not Started", className: "status-pending" }
    };
    return badges[status] || badges.pending;
  };

  const handleExportReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`http://localhost:5000/api/reports/team?assignment_id=${team.assignment_id}`, config);
      if (response.data.success) {
        toast.info(`Generating report for ${team.team_name}...`);
        await generateProfessionalPDF(response.data, 'team-report');
        toast.success("Team report downloaded");
      } else {
        throw new Error(response.data.message || "Failed to fetch report data");
      }
    } catch (error) {
      toast.error("Failed to generate team report");
    }
  };

  if (loading) return <div className="loading-text">Loading team performance...</div>;
  if (!team) return null;

  return (
    <div className="team-performance-container">
      <div className="performance-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-content">
          <h1 className="team-title">{team.team_name}</h1>
          <p className="team-subtitle">{team.cycle_name} • {team.department_name}</p>
        </div>
        <button className="export-btn" onClick={handleExportReport}>
          📊 Export Report
        </button>
      </div>

      {teamStats && (
        <div className="stats-grid">
          <div className="stat-card primary-stat">
            <h3>Average Score</h3>
            <div className="stat-value-large">{teamStats.avgScore ? teamStats.avgScore.toFixed(1) : "—"}</div>
            <p className="stat-label">Team Performance</p>
          </div>
          <div className="stat-card">
            <h3>Completion Rate</h3>
            <div className="stat-value-large">
              {team.employee_count > 0 ? Math.round((team.completed_evaluations / team.employee_count) * 100) : 0}%
            </div>
            <p className="stat-label">{team.completed_evaluations}/{team.employee_count} Evaluations</p>
          </div>
          <div className="stat-card">
            <h3>Performance Distribution</h3>
            {(() => {
              const completed = employees.filter(e => e.status === 'completed' && e.overall_score);
              const excellent = completed.filter(e => parseFloat(e.overall_score) > 80).length;
              const average   = completed.filter(e => parseFloat(e.overall_score) >= 70 && parseFloat(e.overall_score) <= 80).length;
              const attention = completed.filter(e => parseFloat(e.overall_score) < 70).length;
              return (
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{excellent}</div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Excellent</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>&gt;80%</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{average}</div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Average</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>70–80%</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{attention}</div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Attention</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>&lt;70%</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {teamStats && (teamStats.topPerformer || employees.length > 0) && (
        <div className="performers-section">
          <h2 className="section-title">Key Performers</h2>
          <div className="performers-grid">
            {teamStats.topPerformer && (
              <div className="performer-card top-performer-card">
                <div className="performer-header"><span className="performer-icon">🏆</span><h3>Top Performer</h3></div>
                <div className="performer-details">
                  {parseFloat(teamStats.topPerformer.score) <= 70 && (
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Highest Among Low Performers</p>
                  )}
                  <p className="performer-name">{teamStats.topPerformer.name}</p>
                  <p className="performer-designation">{teamStats.topPerformer.designation}</p>
                  <div className="performer-score"><span className="score-label">Score:</span><span className="score-value">{teamStats.topPerformer.score}</span></div>
                </div>
              </div>
            )}
            {(() => {
              const needSupport = employees
                .filter(e => e.status === 'completed' && parseFloat(e.overall_score) < 70)
                .sort((a, b) => parseFloat(a.overall_score) - parseFloat(b.overall_score))
                .slice(0, 3);
              return (
                <div className="performer-card low-performer-card">
                  <div className="performer-header"><span className="performer-icon">📊</span><h3>Needs Support</h3></div>
                  <div className="performer-details">
                    {needSupport.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 80, paddingTop: 20 }}>
                        <p style={{ margin: 0, fontSize: 16, color: '#475569', fontWeight: 600, textAlign: 'center' }}>All members are performing well</p>
                      </div>
                    ) : needSupport.map((emp, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < needSupport.length - 1 ? 6 : 0, padding: '4px 0', borderBottom: i < needSupport.length - 1 ? '1px solid #fee2e2' : 'none' }}>
                        <div>
                          <p className="performer-name" style={{ margin: 0, fontSize: 13 }}>{emp.name}</p>
                          <p className="performer-designation" style={{ margin: 0, fontSize: 11 }}>{emp.designation}</p>
                        </div>
                        <span className="score-value" style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>{parseFloat(emp.overall_score).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div className="members-section">
        <h2 className="section-title">Team Members ({employees.length})</h2>
        <div className="members-list">
          {employees.map((employee) => {
            const badge = getStatusBadge(employee.status);
            return (
              <div key={employee.employee_id} className="member-card">
                <div className="member-info">
                  <div className="member-avatar">{employee.name.charAt(0).toUpperCase()}</div>
                  <div className="member-details">
                    <h4 className="member-name">{employee.name}</h4>
                    <p className="member-designation">{employee.designation}</p>
                    <p className="member-email">{employee.email}</p>
                  </div>
                </div>
                <div className="member-stats">
                  <div className="member-stat">
                    <span className="stat-label-sm">Progress</span>
                    <div className="progress-mini">
                      <div className="progress-mini-fill" style={{ width: `${employee.progress}%` }}></div>
                    </div>
                    <span className="stat-value-sm">{employee.progress}%</span>
                  </div>
                  {employee.status === 'completed' && employee.overall_score && (
                    <div className="member-stat">
                      <span className="stat-label-sm">Score</span>
                      <span className="stat-value-score">{parseFloat(employee.overall_score).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="member-actions">
                  <span className={`status-badge-sm ${badge.className}`}>{badge.text}</span>
                  <button
                    className="action-btn-sm"
                    onClick={() => {
                      if (employee.status === 'completed') {
                        navigate("/view-performance-report", {
                          state: {
                            employee: {
                              id: employee.employee_id,
                              evaluation_id: employee.evaluation_id,
                              name: employee.name,
                              email: employee.email,
                              designation: employee.designation,
                              profile_image: employee.profile_image
                            }
                          }
                        });
                      } else {
                        navigate("/evaluate-employee", {
                          state: {
                            evaluationId: employee.evaluation_id,
                            employeeId: employee.employee_id,
                            employeeName: employee.name,
                            employeeEmail: employee.email,
                            designation: employee.designation,
                            profileImage: employee.profile_image,
                            matrixId: team.matrix_id,
                            matrixName: team.matrix_name,
                            teamName: team.team_name,
                            progress: employee.progress,
                            totalParams: employee.total_params
                          }
                        });
                      }
                    }}
                  >
                    {employee.status === 'completed' ? 'View' : 'Evaluate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Parameter Performance Chart */}
      {(() => {
        if (!paramData.length) return null;

        let chartData = [...paramData]
          .map(p => ({ name: p.name, score: parseFloat(p.avg_score || 0) }))
          .sort((a, b) => a.score - b.score);

        if (chartData.length > 8) chartData = chartData.slice(0, 5);

        const weakest  = chartData[0];
        const strongest = chartData[chartData.length - 1];

        return (
          <div style={{ margin: '16px 0 0', background: '#fff', border: '1.5px solid #e1e8f0', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(45,108,223,0.07)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e3a5f', margin: '0 0 12px 0' }}>Parameter Performance Analysis</h2>

            {/* Insights */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                ⚠ Weakest: {weakest.name} ({weakest.score}%)
              </div>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                ★ Strongest: {strongest.name} ({strongest.score}%)
              </div>
            </div>

            <ResponsiveContainer width="100%" height={chartData.length * 52 + 20}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12, fill: '#334155' }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={28}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.name === weakest.name ? '#ef4444' : entry.name === strongest.name ? '#10b981' : '#3b82f6'}
                    />
                  ))}
                  <LabelList dataKey="score" position="right" formatter={v => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminViewTeamsPerformance;
