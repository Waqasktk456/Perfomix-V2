// LineManager/screens/TeamPerformance.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import "./team-performance.css";

const TeamPerformance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const team = location.state;

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState(null);

  useEffect(() => {
    if (!team) {
      toast.error("No team data found");
      navigate("/linemanager-dashboard");
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

        const response = await axios.get(
          `http://localhost:5000/api/line-manager/team-employees/${team.assignment_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.data.success) {
          throw new Error("Failed to load team data");
        }

        const employeesData = response.data.employees || [];
        setEmployees(employeesData);

        // Use the top/low performer data from the team object (already calculated by backend)
        let topPerformer = null;
        let lowPerformer = null;
        let lastActivity = team.last_activity || null;

        // Extract top performer from team data
        if (team.top_performer && team.top_performer.name) {
          topPerformer = {
            name: team.top_performer.name,
            score: team.top_performer.score,
            designation: team.top_performer.designation || "N/A"
          };
        }

        // Extract low performer from team data
        if (team.low_performer && team.low_performer.name) {
          lowPerformer = {
            name: team.low_performer.name,
            score: team.low_performer.score,
            designation: team.low_performer.designation || "N/A"
          };
        }

        setTeamStats({
          topPerformer,
          lowPerformer,
          lastActivity,
          avgScore: team.avg_performance_score || 0
        });

        setLoading(false);
      } catch (err) {
        toast.error("Failed to load team performance");
        setLoading(false);
      }
    };

    fetchTeamPerformance();
  }, [team, navigate]);

  const formatLastActivity = (dateString) => {
    if (!dateString) return "No activity yet";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

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
      if (!token) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // team.id is usually the assignment_id in this context's URL/params
      // If team.id is not correct, we check how assignment_id is passed
      const response = await axios.get(`http://localhost:5000/api/reports/team?assignment_id=${team.assignment_id}`, config);

      if (response.data.success) {
        toast.info(`Generating professional report for ${team.team_name}...`);
        await generateProfessionalPDF(response.data, 'team-report');
        toast.success("Team report downloaded");
      } else {
        throw new Error(response.data.message || "Failed to fetch report data");
      }
    } catch (error) {
      console.error('Team PDF Export Error:', error);
      toast.error("Failed to generate professional team report");
    }
  };

  if (loading) {
    return <div className="loading-text">Loading team performance...</div>;
  }

  if (!team) {
    return null;
  }

  return (
    <div className="team-performance-container">
      {/* Header Section */}
      <div className="performance-header">
        <button className="back-btn" onClick={() => navigate("/linemanager-dashboard")}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1 className="team-title">{team.team_name}</h1>
          <p className="team-subtitle">
            {team.cycle_name} • {team.department_name}
          </p>
        </div>
        <button className="export-btn" onClick={handleExportReport}>
          📊 Export Report
        </button>
      </div>

      {/* Team Statistics Section */}
      {teamStats && (
        <div className="stats-grid">
          <div className="stat-card primary-stat">
            <h3>Average Score</h3>
            <div className="stat-value-large">
              {teamStats.avgScore ? teamStats.avgScore.toFixed(1) : "—"}
            </div>
            <p className="stat-label">Team Performance</p>
          </div>

          <div className="stat-card">
            <h3>Completion Rate</h3>
            <div className="stat-value-large">
              {team.employee_count > 0
                ? Math.round((team.completed_evaluations / team.employee_count) * 100)
                : 0}%
            </div>
            <p className="stat-label">
              {team.completed_evaluations}/{team.employee_count} Evaluations
            </p>
          </div>

          <div className="stat-card">
            <h3>Last Activity</h3>
            <div className="stat-value-medium">
              {formatLastActivity(teamStats.lastActivity)}
            </div>
            <p className="stat-label">Most Recent Update</p>
          </div>
        </div>
      )}

      {/* Key Performers Section */}
      {teamStats && (teamStats.topPerformer || teamStats.lowPerformer) && (
        <div className="performers-section">
          <h2 className="section-title">Key Performers</h2>
          <div className="performers-grid">
            {teamStats.topPerformer && (
              <div className="performer-card top-performer-card">
                <div className="performer-header">
                  <span className="performer-icon">🏆</span>
                  <h3>Top Performer</h3>
                </div>
                <div className="performer-details">
                  <p className="performer-name">{teamStats.topPerformer.name}</p>
                  <p className="performer-designation">{teamStats.topPerformer.designation}</p>
                  <div className="performer-score">
                    <span className="score-label">Score:</span>
                    <span className="score-value">{teamStats.topPerformer.score}</span>
                  </div>
                </div>
              </div>
            )}

            {teamStats.lowPerformer && (
              <div className="performer-card low-performer-card">
                <div className="performer-header">
                  <span className="performer-icon">📊</span>
                  <h3>Needs Support</h3>
                </div>
                <div className="performer-details">
                  <p className="performer-name">{teamStats.lowPerformer.name}</p>
                  <p className="performer-designation">{teamStats.lowPerformer.designation}</p>
                  <div className="performer-score">
                    <span className="score-label">Score:</span>
                    <span className="score-value">{teamStats.lowPerformer.score}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="members-section">
        <h2 className="section-title">Team Members ({employees.length})</h2>
        <div className="members-list">
          {employees.map((employee) => {
            const badge = getStatusBadge(employee.status);
            return (
              <div key={employee.employee_id} className="member-card">
                <div className="member-info">
                  <div className="member-avatar">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
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
                      <div
                        className="progress-mini-fill"
                        style={{ width: `${employee.progress}%` }}
                      ></div>
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
                  <span className={`status-badge-sm ${badge.className}`}>
                    {badge.text}
                  </span>
                  <button
                    className="action-btn-sm"
                    onClick={() => navigate("/evaluate-employee", {
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
                    })}
                  >
                    {employee.status === 'completed' ? 'View' : 'Evaluate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamPerformance;