import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'react-toastify';
import './LineManagerTeamsPerformance.css';

const LineManagerTeamsPerformance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    lineManagerId,
    lineManagerName,
    cycleId,
    cycleName
  } = location.state || {};

  useEffect(() => {
    if (!lineManagerId || !cycleId) {
      toast.error("Missing line manager or cycle information");
      navigate('/line-manager-evaluation');
      return;
    }
    fetchTeamsPerformance();
  }, [lineManagerId, cycleId]);

  const fetchTeamsPerformance = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch teams assigned to this line manager in this cycle
      const response = await axios.get(
        `http://localhost:5000/api/line-manager/teams-performance/${lineManagerId}/${cycleId}`,
        config
      );

      if (response.data.success) {
        setTeams(response.data.teams || []);
      }
    } catch (error) {
      console.error('Error fetching teams performance:', error);
      toast.error('Failed to fetch teams performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTeamDetails = (team) => {
    navigate('/team-performance', {
      state: {
        assignment_id: team.assignment_id,
        team_id: team.team_id,
        team_name: team.team_name,
        matrix_id: team.matrix_id,
        matrix_name: team.matrix_name,
        department_name: team.department_name,
        cycle_name: cycleName,
        start_date: team.start_date,
        end_date: team.end_date,
        employee_count: team.employee_count,
        completed_evaluations: team.completed_evaluations,
        pending_evaluations: team.pending_evaluations,
        avg_performance_score: team.avg_performance_score,
        top_performer: team.top_performer,
        low_performer: team.low_performer,
        last_activity: team.last_activity
      }
    });
  };

  const calculateProgress = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return <div className="loading">Loading teams performance...</div>;
  }

  return (
    <div className="lm-teams-performance-container">
      {/* Header Section */}
      <div className="lm-teams-performance-header">
        <button className="back-button" onClick={() => navigate('/line-manager-evaluation')}>
          ← Back
        </button>
        <div>
          <h1>Teams Performance Report</h1>
          <p className="lm-teams-subtitle">
            {lineManagerName} • {cycleName}
          </p>
        </div>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="empty-state">
          <p className="empty-message-dept">No teams assigned to this line manager in this cycle</p>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => {
            const progress = calculateProgress(
              team.completed_evaluations || 0,
              team.employee_count || 0
            );

            return (
              <div key={team.assignment_id} className="team-performance-card">
                {/* Card Header */}
                <div className="team-card-header">
                  <h3 className="team-name">{team.team_name}</h3>
                  <span className="team-department">{team.department_name}</span>
                </div>

                {/* Quick Stats */}
                <div className="team-stats-grid">
                  <div className="stat-box">
                    <div className="stat-value">{team.employee_count || 0}</div>
                    <div className="stat-label">Total Members</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value success">{team.completed_evaluations || 0}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value warning">{team.pending_evaluations || 0}</div>
                    <div className="stat-label">Pending</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value primary">
                      {team.avg_performance_score ? team.avg_performance_score.toFixed(1) : '—'}
                    </div>
                    <div className="stat-label">Avg Score</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="team-progress-section">
                  <div className="progress-header">
                    <span className="progress-label">Evaluation Progress</span>
                    <span className="progress-percentage">{progress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Matrix Info */}
                <div className="team-matrix-info">
                  <span className="matrix-label">Matrix:</span>
                  <span className="matrix-name">{team.matrix_name}</span>
                </div>

                {/* Action Button */}
                <button
                  className="btn-view-details"
                  onClick={() => handleViewTeamDetails(team)}
                >
                  View Team Details
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LineManagerTeamsPerformance;
