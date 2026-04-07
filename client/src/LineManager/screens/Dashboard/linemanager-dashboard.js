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
  });
  const [teams, setTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sendingReminder, setSendingReminder] = useState({});
  const [allCycles, setAllCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { toast.error("Session expired"); navigate("/login"); return; }

        // Fetch cycles
        const cyclesRes = await axios.get("http://localhost:5000/api/cycles", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const cyclesData = Array.isArray(cyclesRes.data) ? cyclesRes.data : (cyclesRes.data.data || []);
        setAllCycles(cyclesData);
        if (cyclesData.length > 0) setSelectedCycleId(cyclesData[0].id);

        // Fetch all teams
        const response = await axios.get("http://localhost:5000/api/line-manager/assigned-teams", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.data.success) throw new Error("Failed to load data");

        const teamsData = response.data.teams || [];
        const processedTeams = teamsData.map(team => {
          let status = "pending";
          let isOverdue = false;
          let timeStatus = null;
          if (team.end_date) {
            const diffDays = Math.ceil((new Date(team.end_date) - new Date()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0 && (team.pending_evaluations || 0) > 0) {
              isOverdue = true; status = "overdue";
              timeStatus = { type: "overdue", days: Math.abs(diffDays) };
            } else if ((team.pending_evaluations || 0) === 0) {
              status = "completed"; timeStatus = { type: "completed", days: 0 };
            } else {
              timeStatus = { type: "remaining", days: diffDays };
            }
          } else if ((team.pending_evaluations || 0) === 0) {
            status = "completed";
          }
          return { ...team, status, isOverdue, timeStatus,
            avg_performance_score: team.avg_performance_score || 0,
            reminder_sent: team.reminder_sent || false,
            reminder_sent_at: team.reminder_sent_at || null };
        });

        setAllTeams(processedTeams);
        setLoading(false);
      } catch (err) {
        toast.error("Failed to load dashboard");
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // Filter teams by selected cycle and recompute summary
  useEffect(() => {
    const cycleTeams = selectedCycleId
      ? allTeams.filter(t => Number(t.cycle_id) === Number(selectedCycleId))
      : allTeams;

    let totalEmployees = 0, pending = 0, completed = 0;
    cycleTeams.forEach(team => {
      totalEmployees += team.employee_count || 0;
      completed += team.completed_evaluations || 0;
      pending += team.pending_evaluations || 0;
    });

    setSummary({ totalTeams: cycleTeams.length, totalEmployees, pendingEvaluations: pending, completedEvaluations: completed });
    setTeams(cycleTeams);
    setFilteredTeams(cycleTeams);
  }, [selectedCycleId, allTeams]);

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

      {/* Stats Cards */}
      <div className="stats-container">
        {[
          { title: "Total Teams Assigned", count: summary.totalTeams, img: TotalTeams },
          { title: "Total Employees", count: summary.totalEmployees, img: TotalEmployeesIcon },
          { title: "Pending Evaluations", count: summary.pendingEvaluations, img: PendingEvaluation },
          { title: "Completed Evaluations", count: summary.completedEvaluations, img: CompletedIcon },
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

      {/* Evaluation Cycles Dropdown */}
      <div className="cycle-selection-container">
        <label htmlFor="lm-cycle-select" className="cycle-label">
          Evaluation Cycle:
        </label>
        <select
          id="lm-cycle-select"
          className="cycle-dropdown"
          value={selectedCycleId ? String(selectedCycleId) : ''}
          onChange={(e) => setSelectedCycleId(Number(e.target.value))}
        >
          {allCycles.length === 0 ? (
            <option value="">No cycles available</option>
          ) : (
            allCycles.map((cycle) => (
              <option key={cycle.id} value={String(cycle.id)}>
                {cycle.name || cycle.cycle_name}
              </option>
            ))
          )}
        </select>
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
                      onClick={() => navigate("/line-manager-team-performance", { 
                        state: {
                          assignment_id: team.assignment_id,
                          team_id: team.team_id,
                          team_name: team.team_name,
                          department_name: team.department_name,
                          employee_count: team.employee_count,
                          completed_evaluations: team.completed_evaluations,
                          pending_evaluations: team.pending_evaluations,
                          avg_performance_score: team.avg_performance_score,
                          matrix_name: team.matrix_name,
                          matrix_id: team.matrix_id,
                          cycle_id: team.cycle_id,
                          cycle_name: team.cycle_name,
                          top_performer: team.top_performer,
                          low_performer: team.low_performer,
                          last_activity: team.last_activity
                        }
                      })}
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