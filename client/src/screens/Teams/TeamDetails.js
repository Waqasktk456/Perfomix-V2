import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./TeamDetails.css";
import "../Employees/Employees.css";

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

const TeamDetails = () => {
  const { team_id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); throw new Error("No token"); }
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const config = getAuthConfig();
        const [teamRes, membersRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/teams/${team_id}`, config),
          axios.get(`http://localhost:5000/api/teams/${team_id}/members`, config),
        ]);
        setTeam(teamRes.data.data);
        setMembers(membersRes.data.data || []);
      } catch (err) {
        setError("Failed to load team details");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [team_id]);

  if (loading) return <div className="loading">Loading team details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!team) return <div className="error">Team not found</div>;

  return (
    <div className="team-details-container">
      <div className="employee-details-header">
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <div className="header-content"><h1>Team Details</h1></div>
      </div>

      {/* Info cards */}
      <div className="employee-details-card" style={{ marginBottom: '24px' }}>
        <div className="details-content">
          <div className="section-title">Team Information</div>
          <div className="detail-group">
            <div className="detail-item">
              <div className="detail-icon">🏷️</div>
              <div className="detail-info">
                <span className="detail-label">Team Name</span>
                <span className="detail-value">{team.team_name}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">🏢</div>
              <div className="detail-info">
                <span className="detail-label">Department</span>
                <span className="detail-value">{team.department_name || 'N/A'}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">👥</div>
              <div className="detail-info">
                <span className="detail-label">No of Employees</span>
                <span className="detail-value">{members.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members table */}
      <div className="employee-details-card">
        <div className="section-title" style={{ marginBottom: '16px' }}>Team Members</div>
        {members.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '24px 0' }}>No members in this team</p>
        ) : (
          <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <table className="employees-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Name</th>
                  <th style={{ textAlign: 'left' }}>Email</th>
                  <th style={{ textAlign: 'left' }}>Department</th>
                  <th style={{ textAlign: 'left' }}>Designation</th>
                </tr>
              </thead>
              <tbody>
                {members.map((emp, index) => (
                  <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/employees/details/${emp.id}`)}>
                    <td>
                      <div className="emp-name-cell">
                        {emp.profile_image ? (
                          <img
                            src={`http://localhost:5000${emp.profile_image}`}
                            alt={emp.first_name}
                            className="emp-avatar"
                          />
                        ) : (
                          <div
                            className="emp-avatar emp-avatar-fallback"
                            style={{ background: getAvatarColor(`${emp.first_name}${emp.last_name}`) }}
                          >
                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                          </div>
                        )}
                        <span className="emp-name-text">{emp.first_name} {emp.last_name}</span>
                      </div>
                    </td>
                    <td><a href={`mailto:${emp.email}`}>{emp.email}</a></td>
                    <td>
                      {emp.department_name && emp.department_name !== 'N/A' ? (() => {
                        const c = getDeptBadgeColor(emp.department_name);
                        return <span className="dept-badge" style={{ background: c.bg, color: c.text }}>{emp.department_name}</span>;
                      })() : 'N/A'}
                    </td>
                    <td>{emp.designation || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetails;
