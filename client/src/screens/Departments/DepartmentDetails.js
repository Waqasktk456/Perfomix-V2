import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Department.css";
import "../Teams/Teams.css";
import "../Employees/Employees.css";
import axios from 'axios';

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
const getDeptBadgeColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_BADGE_COLORS[Math.abs(hash) % DEPT_BADGE_COLORS.length];
};

const DepartmentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const departmentId = location.state?.departmentId;
  const [department, setDepartment] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error("No authentication token found");
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  useEffect(() => {
    if (departmentId) fetchAll();
    else { setError('No department selected'); setLoading(false); }
  }, [departmentId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();
      const [deptRes, teamsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/departments/${departmentId}`, config),
        axios.get(`http://localhost:5000/api/teams`, config),
      ]);
      setDepartment(deptRes.data);
      const allTeams = Array.isArray(teamsRes.data) ? teamsRes.data : [];
      setTeams(allTeams.filter(t => t.department_id === departmentId || t.department_id === Number(departmentId)));
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) { setError('Session expired.'); setTimeout(() => navigate('/login'), 2000); }
      else if (err.response?.status === 404) setError('Department not found');
      else setError('Failed to fetch department details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading department details...</div>;
  if (error) return (
    <div className="error-container">
      <div className="error-message">{error}</div>
      <button className="back-button" onClick={() => navigate("/departments")}>← Back to Departments</button>
    </div>
  );
  if (!department) return (
    <div className="error-container">
      <div className="error-message">Department not found</div>
      <button className="back-button" onClick={() => navigate("/departments")}>← Back to Departments</button>
    </div>
  );

  return (
    <div className="department-details-container">
      <div className="department-details-header">
        <button className="back-button" onClick={() => navigate("/departments")}>← Back to Departments</button>
        <div className="header-content"><h1>Department Details</h1></div>
        <button className="add-department-btn" style={{ marginLeft: 'auto' }} onClick={() => navigate("/add-department", { state: { dept: department } })}>
          Edit Department
        </button>
      </div>

      <div className="department-details-card">
        <div className="details-content">

          {/* 3-per-row info cards */}
          <div className="detail-group" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="detail-item">
              <div className="detail-icon">🏢</div>
              <div className="detail-info">
                <span className="detail-label">Department Code</span>
                <span className="detail-value">{department.department_code}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">📋</div>
              <div className="detail-info">
                <span className="detail-label">Department Name</span>
                <span className="detail-value">{department.department_name}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">🏛️</div>
              <div className="detail-info">
                <span className="detail-label">Organization</span>
                <span className="detail-value">{department.organization_name || 'N/A'}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">📧</div>
              <div className="detail-info">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">
                  <a href={`mailto:${department.department_email}`}>{department.department_email}</a>
                </span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">👥</div>
              <div className="detail-info">
                <span className="detail-label">No of Teams</span>
                <span className="detail-value">{teams.length}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">👨‍💼</div>
              <div className="detail-info">
                <span className="detail-label">No of Employees</span>
                <span className="detail-value">{department.number_of_employees}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">🏷️</div>
              <div className="detail-info">
                <span className="detail-label">Department Type</span>
                <span className="detail-value">{department.department_type}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">👤</div>
              <div className="detail-info">
                <span className="detail-label">Head of Department</span>
                <span className="detail-value">{department.hod || 'N/A'}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">✅</div>
              <div className="detail-info">
                <span className="detail-label">Status</span>
                <span className="detail-value">{department.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {department.department_description && (
            <div className="description-section">
              <div className="detail-icon">📝</div>
              <div className="description-content">
                <span className="detail-label">Description</span>
                <p className="detail-value">{department.department_description}</p>
              </div>
            </div>
          )}

          {/* Teams table */}
          <div>
            <div className="section-title" style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #f0f0f0' }}>
              Teams in this Department
            </div>
            {teams.length === 0 ? (
              <p style={{ color: '#888', padding: '16px 0' }}>No teams in this department</p>
            ) : (
              <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <table className="departments-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Department</th>
                      <th style={{ width: '140px' }}>Employees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, index) => (
                      <tr
                        key={team.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/teams/details/${team.id}`)}
                      >
                        <td><span className="emp-name-text">{team.team_name}</span></td>
                        <td>
                          {team.department_name ? (() => {
                            const c = getDeptBadgeColor(team.department_name);
                            return <span className="dept-badge" style={{ background: c.bg, color: c.text }}>{team.department_name}</span>;
                          })() : 'N/A'}
                        </td>
                        <td>{team.number_of_members ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default DepartmentDetails;