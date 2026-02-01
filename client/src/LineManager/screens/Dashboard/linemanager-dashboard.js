// LineManager/screens/LineManagerDashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./linemanager-dashboard.css";
import TotalTeams from '../../../assets/images/total-department.png';
import TotalEmployeesIcon from '../../../assets/images/total-employee.png';
import PendingEvaluation from '../../../assets/images/pending-evaluation.png';
import CompletedIcon from '../../../assets/images/total-department.png';
import OverdueIcon from '../../../assets/images/new-hires.png';

const LineManagerDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    totalTeams: 0,
    totalEmployees: 0,
    pendingEvaluations: 0,
    completedEvaluations: 0,
    overdueEvaluations: 0
  });
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sendingReminder, setSendingReminder] = useState({});
  const [todayFocus, setTodayFocus] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Session expired");
          navigate("/login");
          return;
        }

        const response = await axios.get("http://localhost:5000/api/line-manager/assigned-teams", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
          throw new Error("Failed to load data");
        }

        const teamsData = response.data.teams || [];

        let totalEmployees = 0;
        let pending = 0;
        let completed = 0;
        let overdue = 0;
        let nearestDeadline = null;

        const processedTeams = teamsData.map(team => {
          totalEmployees += team.employee_count || 0;
          completed += team.completed_evaluations || 0;
          pending += team.pending_evaluations || 0;

          let status = "pending";
          let isOverdue = false;
          let timeStatus = null;

          if (team.end_date) {
            const endDate = new Date(team.end_date);
            const today = new Date();
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0 && (team.pending_evaluations || 0) > 0) {
              overdue += team.pending_evaluations || 0;
              isOverdue = true;
              status = "overdue";
              timeStatus = { type: "overdue", days: Math.abs(diffDays) };
            } else if ((team.pending_evaluations || 0) === 0) {
              status = "completed";
              timeStatus = { type: "completed", days: 0 };
            } else {
              timeStatus = { type: "remaining", days: diffDays };
              
              // Track nearest deadline
              if (!nearestDeadline || diffDays < nearestDeadline.days) {
                nearestDeadline = {
                  team_name: team.team_name,
                  end_date: team.end_date,
                  days: diffDays
                };
              }
            }
          } else if ((team.pending_evaluations || 0) === 0) {
            status = "completed";
          }

          return { 
            ...team, 
            status, 
            isOverdue, 
            timeStatus,
            avg_performance_score: team.avg_performance_score || 0,
            reminder_sent: team.reminder_sent || false,
            reminder_sent_at: team.reminder_sent_at || null
          };
        });

        setSummary({
          totalTeams: teamsData.length,
          totalEmployees,
          pendingEvaluations: pending,
          completedEvaluations: completed,
          overdueEvaluations: overdue
        });

        setTodayFocus({
          pendingCount: pending,
          overdueCount: overdue,
          nearestDeadline
        });

        setTeams(processedTeams);
        setFilteredTeams(processedTeams);
        setLoading(false);
      } catch (err) {
        toast.error("Failed to load dashboard");
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    let filtered = teams;

    if (searchQuery) {
      filtered = filtered.filter(team =>
        team.team_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(team => team.status === statusFilter);
    }

    setFilteredTeams(filtered);
  }, [searchQuery, statusFilter, teams]);

  const getStatusBadge = (status) => {
    const badges = {
      overdue: { text: "Overdue", className: "status-badge-overdue" },
      pending: { text: "Pending", className: "status-badge-pending" },
      completed: { text: "Completed", className: "status-badge-completed" }
    };
    return badges[status] || badges.pending;
  };

  const calculateProgress = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const formatTimeStatus = (timeStatus) => {
    if (!timeStatus) return null;
    
    if (timeStatus.type === "overdue") {
      return (
        <span className="time-badge overdue-badge">
          ⚠️ {timeStatus.days}d overdue
        </span>
      );
    } else if (timeStatus.type === "remaining") {
      const urgency = timeStatus.days <= 3 ? "urgent" : timeStatus.days <= 7 ? "warning" : "normal";
      return (
        <span className={`time-badge ${urgency}-badge`}>
          {timeStatus.days}d left
        </span>
      );
    } else if (timeStatus.type === "completed") {
      return <span className="time-badge completed-badge">✓ Done</span>;
    }
  };

  const getActionButtonLabel = (team) => {
    if (team.status === "overdue") {
      return "Resolve Overdue";
    } else if (team.pending_evaluations === 0) {
      return "View Evaluation";
    } else {
      return "Continue Evaluation";
    }
  };

  const handleSendReminder = async (team) => {
    try {
      setSendingReminder(prev => ({ ...prev, [team.assignment_id]: true }));
      
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/line-manager/send-reminder",
        { assignment_id: team.assignment_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`Reminder sent to ${team.team_name} members`);
        
        setTeams(prevTeams => prevTeams.map(t => 
          t.assignment_id === team.assignment_id 
            ? { ...t, reminder_sent: true, reminder_sent_at: new Date().toISOString() }
            : t
        ));
      }
    } catch (error) {
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(prev => ({ ...prev, [team.assignment_id]: false }));
    }
  };

  const formatDeadlineDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper function to navigate to evaluate page with proper state
  const navigateToEvaluate = (team) => {
    navigate("/evaluate-employee-all", { 
      state: {
        assignmentId: team.assignment_id,
        teamId: team.team_id,
        matrixId: team.matrix_id,
        teamName: team.team_name,
        matrixName: team.matrix_name,
        department: team.department_name,
        employeeCount: team.employee_count
      }
    });
  };

  if (loading) {
    return <div className="loading-text">Loading dashboard...</div>;
  }

  const overdueTeams = teams.filter(t => t.isOverdue);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Line Manager Dashboard</h1>

      {/* Today's Focus Section */}
      {todayFocus && (todayFocus.pendingCount > 0 || todayFocus.overdueCount > 0) && (
        <div className="today-focus-section">
          <h3 className="focus-title">📋 Today's Focus</h3>
          <div className="focus-items">
            {todayFocus.pendingCount > 0 && (
              <div className="focus-item pending-focus">
                <span className="focus-number">{todayFocus.pendingCount}</span>
                <span className="focus-label">Pending Evaluation{todayFocus.pendingCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {todayFocus.overdueCount > 0 && (
              <div className="focus-item overdue-focus">
                <span className="focus-number">{todayFocus.overdueCount}</span>
                <span className="focus-label">Overdue Evaluation{todayFocus.overdueCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {todayFocus.nearestDeadline && (
              <div className="focus-item deadline-focus">
                <span className="focus-icon">🎯</span>
                <div className="focus-deadline-content">
                  <span className="focus-deadline-label">Nearest Deadline</span>
                  <span className="focus-deadline-info">
                    {todayFocus.nearestDeadline.team_name} • {formatDeadlineDate(todayFocus.nearestDeadline.end_date)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-container">
        {[
          { title: "Total Teams Assigned", count: summary.totalTeams, img: TotalTeams },
          { title: "Total Employees", count: summary.totalEmployees, img: TotalEmployeesIcon },
          { title: "Pending Evaluations", count: summary.pendingEvaluations, img: PendingEvaluation },
          { title: "Completed Evaluations", count: summary.completedEvaluations, img: CompletedIcon },
          { title: "Overdue Evaluations", count: summary.overdueEvaluations, img: OverdueIcon },
        ].map((card, index) => (
          <div className="stats-card" key={index}>
            <div className="card-content">
              <div className="card-text">
                <h3>{card.title}</h3>
                <p className="count">{card.count}</p>
              </div>
              <img src={card.img} alt={card.title} className="card-icon" />
            </div>
          </div>
        ))}
      </div>

      {/* Action Required Section */}
      {overdueTeams.length > 0 && (
        <div className="action-required-section">
          <div className="action-header">
            <h3>⚠️ Action Required</h3>
            <span className="urgent-badge">{overdueTeams.length} Team{overdueTeams.length > 1 ? 's' : ''} Need Attention</span>
          </div>
          <p className="action-description">
            You have <strong>{summary.overdueEvaluations} overdue evaluations</strong> across {overdueTeams.length} team{overdueTeams.length > 1 ? 's' : ''}. 
          </p>
          <div className="overdue-teams-list">
            {overdueTeams.map(team => (
              <div key={team.assignment_id} className="overdue-team-card">
                <div className="overdue-card-left">
                  <strong>{team.team_name}</strong>
                  <span className="overdue-meta">
                    {team.pending_evaluations} pending • {team.timeStatus && `${team.timeStatus.days}d overdue`}
                  </span>
                </div>
                <div className="overdue-card-right">
                  <button
                    className="btn-primary-sm"
                    onClick={() => navigateToEvaluate(team)}
                  >
                    Evaluate Now
                  </button>
                  {!team.reminder_sent ? (
                    <button
                      className="btn-secondary-sm"
                      onClick={() => handleSendReminder(team)}
                      disabled={sendingReminder[team.assignment_id]}
                    >
                      {sendingReminder[team.assignment_id] ? "Sending..." : "Send Reminder"}
                    </button>
                  ) : (
                    <span className="reminder-badge">✓ Reminded</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search team name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Teams
          </button>
          <button
            className={`filter-btn ${statusFilter === "overdue" ? "active" : ""}`}
            onClick={() => setStatusFilter("overdue")}
          >
            Overdue
          </button>
          <button
            className={`filter-btn ${statusFilter === "pending" ? "active" : ""}`}
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Teams Cards */}
      <div className="teams-section">
        <h3>My Assigned Teams</h3>
        {filteredTeams.length === 0 ? (
          <p className="no-data">
            {searchQuery || statusFilter !== "all" 
              ? "No teams match your search criteria." 
              : "No teams assigned yet."}
          </p>
        ) : (
          <div className="teams-grid">
            {filteredTeams.map((team) => {
              const progress = calculateProgress(
                team.completed_evaluations || 0,
                team.employee_count || 0
              );
              const badge = getStatusBadge(team.status);

              return (
                <div key={team.assignment_id} className={`team-card ${team.isOverdue ? "overdue-card" : ""}`}>
                  {/* Card Header */}
                  <div className="team-card-header">
                    <div className="team-name-section">
                      <h4 className="team-name">
                        {team.isOverdue && <span className="overdue-icon">⚠️</span>}
                        {team.team_name}
                        {team.reminder_sent && <span className="reminder-icon" title="Reminder sent">🔔</span>}
                      </h4>
                      <p className="team-cycle">{team.cycle_name || "N/A"}</p>
                    </div>
                    <div className="team-status-badges">
                      {formatTimeStatus(team.timeStatus)}
                      <span className={`status-badge ${badge.className}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="team-quick-stats">
                    <div className="stat-item">
                      <span className="stat-label">Completed</span>
                      <span className="stat-value success">{team.completed_evaluations || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Pending</span>
                      <span className="stat-value warning">{team.pending_evaluations || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Avg Score</span>
                      <span className="stat-value primary">
                        {team.avg_performance_score ? team.avg_performance_score.toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="team-progress">
                    <div className="progress-header">
                      <span className="progress-label">Progress</span>
                      <span className="progress-percentage">{progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="team-card-actions">
                    <button
                      className="btn-primary"
                      onClick={() => navigateToEvaluate(team)}
                    >
                      {getActionButtonLabel(team)}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => navigate("/team-performance", { state: team })}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LineManagerDashboard;