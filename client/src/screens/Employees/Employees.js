import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Employees.css";
import { EditIcon, DeleteIcon, NoDepartmentImg, EyeIcon } from "../../assets";
import '../../styles/typography.css';

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

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // SEARCH STATES
  const [searchType, setSearchType] = useState("name");
  const [searchValue, setSearchValue] = useState("");
  const [departments, setDepartments] = useState([]);

  // Helper function to get auth headers
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("No authentication token found. Please login again.");
      navigate('/login');
      throw new Error("No token");
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const config = getAuthConfig();
      const res = await axios.get('http://localhost:5000/api/departments', config);
      setDepartments(Array.isArray(res.data) ? res.data : (res.data.data || []));
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const config = getAuthConfig();
      const response = await axios.get('http://localhost:5000/api/employees', config);

      console.log('Fetched employees in employee file:', response.data);
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        navigate('/login');
      } else {
        setError('Failed to fetch employees');
      }
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp) => {
    navigate(`/employees/edit/${emp.id}`);
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const config = getAuthConfig();
        await axios.delete(`http://localhost:5000/api/employees/${employeeId}`, config);
        fetchEmployees(); // Refresh list
      } catch (err) {
        if (err.response?.status === 401) {
          alert('Session expired. Please login again.');
          navigate('/login');
        } else {
          alert('Failed to delete employee');
        }
      }
    }
  };

  const handleRowClick = (emp) => {
    setSelectedEmployee(emp);
  };

  const handleViewDetails = () => {
    if (selectedEmployee) {
      navigate(`/employees/details/${selectedEmployee.id}`);
    } else {
      alert('Please select an employee first');
    }
  };

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // FILTER LOGIC
  const filteredEmployees = employees.filter(emp => {
    if (!searchValue.trim()) return true;
    const value = searchValue.toLowerCase();
    switch (searchType) {
      case "name":
        return `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(value);
      case "designation":
        return emp.role?.toLowerCase().includes(value) ||
          emp.designation?.toLowerCase().includes(value);
      case "department":
        // exact match from dropdown
        return emp.department_name === searchValue;
      default:
        return true;
    }
  });

  // Reset to page 1 when filter changes
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return <div className="loading">Loading employees...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      {/* SEARCH + FILTER + ADD BUTTON in one line */}
      <div className="search-container-main" style={{ justifyContent: 'space-between', margin: '0 0 4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>

          {/* Search input or department dropdown — FIRST */}
          <div className="search-input-wrapper" style={{ width: '350px', flex: 'none' }}>
            {searchType === 'department' ? (
              <select
                value={searchValue}
                onChange={e => { setSearchValue(e.target.value); setCurrentPage(1); }}
                className="search-input-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.department_name}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="search-input-field"
                placeholder={searchType === 'name' ? 'Search by name...' : 'Search by designation...'}
                value={searchValue}
                onChange={e => { setSearchValue(e.target.value); setCurrentPage(1); }}
              />
            )}
          </div>

          {/* Filter by dropdown — SECOND, narrow */}
          <select
            value={searchType}
            onChange={e => { setSearchType(e.target.value); setSearchValue(''); setCurrentPage(1); }}
            style={{
              padding: '12px 14px',
              border: '2px solid #e1e8f0',
              borderRadius: '12px',
              fontSize: '14px',
              backgroundColor: '#fcfdfe',
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '200px',
              width: '200px',
              flexShrink: 0,
              color: '#334155'
            }}
          >
            <option value="name">Filter by Name</option>
            <option value="department">Filter by Department</option>
            <option value="designation">Filter by Designation</option>
          </select>
        </div>

        <button className="add-employee-btn" onClick={() => navigate("/add-employee")} style={{ marginLeft: '20px', whiteSpace: 'nowrap' }}>
          Add Employee
        </button>
      </div>

        {employees.length === 0 ? (
          <div className="empty-state">
            <img
              src={NoDepartmentImg}
              alt="No Employee"
              className="no-employee-img"
            />
            <p className="empty-message-dept">There is no Employee yet</p>
          </div>
        ) : (
          <>
            <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <table className="employees-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}><span style={{ position: 'relative', left: '-40px' }}>Name</span></th>
                  <th style={{ textAlign: 'center' }}><span style={{ position: 'relative', left: '-70px' }}>Email</span></th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center" }}>
                      No employee found
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp, index) => (
                    <tr
                      key={emp.id}
                      onClick={() => handleRowClick(emp)}
                      className={
                        selectedEmployee?.id === emp.id
                          ? "selected-row"
                          : ""
                      }
                      style={{ cursor: "pointer" }}
                    >
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
                          return (
                            <span className="dept-badge" style={{ background: c.bg, color: c.text }}>
                              {emp.department_name}
                            </span>
                          );
                        })() : 'N/A'}
                      </td>
                      <td>{emp.designation || "N/A"}</td>

                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(emp)}
                          className="organization-icon-button action-btn-edit"
                          title="Edit"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="organization-icon-button action-btn-delete"
                          title="Delete"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>

                        <button
                          onClick={() => navigate(`/employees/details/${emp.id}`)}
                          className="organization-icon-button action-btn-view"
                          title="View Details"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <span className="pagination-info">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length}
                </span>

                <div className="pagination-controls">
                  <button
                    className="pagination-btn-nav"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    &laquo; Back
                  </button>

                  {(() => {
                    const groupStart = Math.floor((currentPage - 1) / 5) * 5 + 1;
                    const groupEnd = Math.min(groupStart + 4, totalPages);
                    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i).map(page => (
                      <button
                        key={page}
                        className={`pagination-btn ${currentPage === page ? 'pagination-btn-active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ));
                  })()}

                  <button
                    className="pagination-btn-nav"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next &raquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )
        }
      </div >
      );
};

      export default Employees;