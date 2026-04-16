import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Teams.css";
import "../Employees/Employees.css";
import { NoDepartmentImg, Noteam } from "../../assets";
import '../../styles/typography.css';
import axios from 'axios';

const AVATAR_COLORS = [
  '#e74c3c', '#e67e22', '#f39c12', '#27ae60', '#16a085',
  '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#1abc9c',
];

const DEPT_BADGE_COLORS = [
  { bg: '#e8f0fe', text: '#4a6fa5' },
  { bg: '#e8f5e9', text: '#4a7c59' },
  { bg: '#fef9e7', text: '#8a7340' },
  { bg: '#f3e8ff', text: '#7a5fa5' },
  { bg: '#e0f7fa', text: '#3d7a82' },
  { bg: '#fce4ec', text: '#a05070' },
  { bg: '#fff3e0', text: '#8a6040' },
  { bg: '#e8eaf6', text: '#5560a0' },
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getDeptBadgeColor = (dept = '') => {
  let hash = 0;
  for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_BADGE_COLORS[Math.abs(hash) % DEPT_BADGE_COLORS.length];
};

const Teams = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Helper function to get axios config with token
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error("No authentication token found");
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = getAuthConfig();
      const response = await axios.get("http://localhost:5000/api/teams", config);
      console.log('Fetched Teams:', response.data);
      setTeams(response.data);
    } catch (err) {
      console.error("Error fetching Teams:", err);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        navigate('/login');
      } else {
        setError("Failed to fetch Teams");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team) => {
    console.log(`Checking team ${team.team_name}: active_cycle=${team.is_in_active_cycle}`);
    if (team.is_in_active_cycle > 0) {
      toast.error("Team is in an active cycle cannot be edit or delete");
      return;
    }
    navigate(`/add-team/${team.id}`);
  };

  const handleDelete = async (team) => {
    console.log(`Checking delete team ${team.team_name}: active_cycle=${team.is_in_active_cycle}`);
    if (team.is_in_active_cycle > 0) {
      toast.error("Team is in an active cycle cannot be edit or delete");
      return;
    }

    if (window.confirm(`Are you sure you want to delete team "${team.team_name}"?`)) {
      try {
        const config = getAuthConfig();
        await axios.delete(`http://localhost:5000/api/teams/${team.id}`, config);
        toast.success("Team deleted successfully");
        fetchTeams();
      } catch (err) {
        console.error('Error deleting team:', err);
        const errorMsg = err.response?.data?.error || 'Failed to delete team';
        toast.error(errorMsg);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading teams...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="departments-container">
      {/* Top bar: search left, add button right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div className="search-container-main" style={{ margin: 0 }}>
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input-field"
              placeholder="Search by team name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button className="add-team-btn" onClick={() => navigate('/add-team')}>Add Team</button>
      </div>
      {teams.length === 0 ? (
        <div className="empty-state">
          <img
            src={NoDepartmentImg}
            alt="No Teams"
            className="no-department-img"
          />
          <p className="empty-message-dept">There is no Teams yet</p>
        </div>
      ) : (
        <>
          <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <table className="departments-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th style={{ textAlign: 'center' }}>Employees</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = teams.filter(team => team.team_name?.toLowerCase().includes(searchQuery.toLowerCase()));
                const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                return (
                  <>
                    {paginated.map((team, index) => (
                      <tr key={team.id}>
                        <td>
                          <span className="emp-name-text">{team.team_name}</span>
                        </td>
                        <td>
                          {team.department_name && team.department_name !== 'N/A' ? (() => {
                            const c = getDeptBadgeColor(team.department_name);
                            return (
                              <span className="dept-badge" style={{ background: c.bg, color: c.text }}>
                                {team.department_name}
                              </span>
                            );
                          })() : 'N/A'}
                        </td>
                        <td style={{ textAlign: 'center' }}>{team.number_of_members}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => handleEdit(team)} className="organization-icon-button action-btn-edit" title="Edit Team">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(team)} className="organization-icon-button action-btn-delete" title="Delete Team">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                          <button onClick={() => navigate(`/teams/details/${team.id}`)} className="organization-icon-button action-btn-view" title="View Details">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {totalPages > 1 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '12px 0 4px 0', background: '#fff' }}>
                          <div className="pagination-container">
                            <span className="pagination-info">
                              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                            </span>
                            <div className="pagination-controls">
                              <button className="pagination-btn-nav" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                                &laquo; Back
                              </button>
                              {(() => {
                                const groupStart = Math.floor((currentPage - 1) / 5) * 5 + 1;
                                const groupEnd = Math.min(groupStart + 4, totalPages);
                                return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i).map(page => (
                                  <button key={page} className={`pagination-btn ${currentPage === page ? 'pagination-btn-active' : ''}`} onClick={() => setCurrentPage(page)}>
                                    {page}
                                  </button>
                                ));
                              })()}
                              <button className="pagination-btn-nav" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                                Next &raquo;
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Teams;
