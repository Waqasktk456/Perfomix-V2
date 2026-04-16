import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Department.css";
import "../Employees/Employees.css";
import "../Teams/Teams.css";
import { NoDepartmentImg } from "../../assets";
import '../../styles/typography.css';
import axios from 'axios';

const Departments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
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
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const config = getAuthConfig();
      const response = await axios.get("http://localhost:5000/api/departments", config);

      console.log('Fetched departments:', response.data);
      console.log('First department structure:', response.data[0]);

      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        navigate('/login');
      } else {
        setError("Failed to fetch departments");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept) => {
    navigate("/add-department", { state: { dept } });
  };

  const handleDelete = async (dept) => {
    // Use department ID or code as identifier
    const identifier = dept.id || dept.department_code;
    const departmentName = dept.department_name;

    if (window.confirm(`Are you sure you want to delete "${departmentName}"? This action cannot be undone.`)) {
      try {
        const config = getAuthConfig();

        await axios.delete(
          `http://localhost:5000/api/departments/${identifier}`,
          config
        );

        // Success - refresh the list
        alert('Department deleted successfully');
        fetchDepartments();

        // Clear selection if deleted department was selected
        if (selectedDepartment?.department_code === dept.department_code) {
          setSelectedDepartment(null);
        }

      } catch (err) {
        console.error('Error deleting department:', err);

        if (err.response?.status === 401) {
          alert('Session expired. Please login again.');
          navigate('/login');
        } else if (err.response?.status === 403) {
          alert('You do not have permission to delete this department');
        } else if (err.response?.status === 404) {
          alert('Department not found or already deleted');
        } else {
          alert(err.response?.data?.error || 'Failed to delete department');
        }
      }
    }
  };

  const handleRowClick = (dept) => {
    console.log('Selected department:', dept);
    console.log('Department ID:', dept.id);
    setSelectedDepartment(dept);
  };

  const handleViewDetails = () => {
    if (selectedDepartment) {
      // Get department ID - check both possible field names
      const deptId = selectedDepartment.id || selectedDepartment.department_id;

      if (!deptId) {
        alert('Department ID not found');
        console.error('Selected department:', selectedDepartment);
        return;
      }

      navigate("/department-details", {
        state: { departmentId: deptId }
      });
    } else {
      alert('Please select a department first');
    }
  };

  if (loading) {
    return <div className="loading">Loading departments...</div>;
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
              placeholder="Search by department name..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
        <button className="add-department-btn" onClick={() => navigate("/add-department")}>
          Add Department
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="empty-state">
          <img
            src={NoDepartmentImg}
            alt="No Department"
            className="no-department-img"
          />
          <p className="empty-message-dept">There is no Department yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <table className="departments-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'center' }}>HOD</th>
                  <th style={{ textAlign: 'center' }}>Teams</th>
                  <th style={{ textAlign: 'center' }}>Employees</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = departments.filter(dept =>
                    dept.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                  if (paginated.length === 0) {
                    return <tr><td colSpan="6" style={{ textAlign: 'center' }}>No department found</td></tr>;
                  }

                  return paginated.map((dept) => (
                    <tr
                      key={dept.id || dept.department_code}
                      onClick={() => handleRowClick(dept)}
                      className={selectedDepartment?.department_code === dept.department_code ? 'selected-row' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600, color: '#1e3a5f' }}>{dept.department_name}</td>
                      <td>{dept.department_type || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{dept.hod || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{dept.number_of_teams ?? 0}</td>
                      <td style={{ textAlign: 'center' }}>{dept.number_of_employees ?? 0}</td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <button onClick={() => handleEdit(dept)} className="organization-icon-button action-btn-edit" title="Edit Department">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(dept)} className="organization-icon-button action-btn-delete" title="Delete Department">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate("/department-details", { state: { departmentId: dept.id } })}
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
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            const filtered = departments.filter(dept =>
              dept.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
            if (totalPages <= 1) return null;
            const groupStart = Math.floor((currentPage - 1) / 5) * 5 + 1;
            const groupEnd = Math.min(groupStart + 4, totalPages);
            return (
              <div className="pagination-container" style={{ marginTop: '12px' }}>
                <span className="pagination-info">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div className="pagination-controls">
                  <button className="pagination-btn-nav" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                    &laquo; Back
                  </button>
                  {Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i).map(page => (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? 'pagination-btn-active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button className="pagination-btn-nav" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                    Next &raquo;
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Departments;