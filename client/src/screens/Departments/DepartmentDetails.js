import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Department.css";
import axios from 'axios';

const DepartmentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const departmentId = location.state?.departmentId; // ✅ Changed from departmentCode to departmentId
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    if (departmentId) {
      fetchDepartmentDetails();
    } else {
      setError('No department selected');
      setLoading(false);
    }
  }, [departmentId]);

  const fetchDepartmentDetails = async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();

      // ✅ Fetch by department ID with token
      const response = await axios.get(
        `http://localhost:5000/api/departments/${departmentId}`,
        config
      );

      setDepartment(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching department details:', err);

      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 404) {
        setError('Department not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this department');
      } else {
        setError('Failed to fetch department details');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading department details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button
          className="back-button"
          onClick={() => navigate("/departments")}
        >
          ← Back to Departments
        </button>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="error-container">
        <div className="error-message">Department not found</div>
        <button
          className="back-button"
          onClick={() => navigate("/departments")}
        >
          ← Back to Departments
        </button>
      </div>
    );
  }

  return (
    <div className="department-details-container">
      <div className="department-details-header">
        <button
          className="back-button"
          onClick={() => navigate("/departments")}
        >
          ← Back to Departments
        </button>
        <div className="header-content">
          <h1>Department Details</h1>
        </div>
      </div>

      <div className="department-details-card">
        <div className="details-content">
          <div className="detail-group">
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
          </div>

          <div className="detail-group">
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
                  <a href={`mailto:${department.department_email}`}>
                    {department.department_email}
                  </a>
                </span>
              </div>
            </div>
          </div>

          <div className="detail-group">
            <div className="detail-item">
              <div className="detail-icon">👨‍💼</div>
              <div className="detail-info">
                <span className="detail-label">Number of Employees</span>
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
          </div>

          <div className="detail-group">
            <div className="detail-item">
              <div className="detail-icon">👤</div>
              <div className="detail-info">
                <span className="detail-label">Head of Department (HOD)</span>
                <span className="detail-value">{department.hod || 'N/A'}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">✅</div>
              <div className="detail-info">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  {department.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {department.department_description && (
            <div className="description-section">
              <div className="detail-icon">📝</div>
              <div className="description-content">
                <span className="detail-label">Description</span>
                <p className="detail-value">{department.department_description}</p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="detail-group">
            {department.created_at && (
              <div className="detail-item">
                <div className="detail-icon">📅</div>
                <div className="detail-info">
                  <span className="detail-label">Created At</span>
                  <span className="detail-value">
                    {new Date(department.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {department.updated_at && (
              <div className="detail-item">
                <div className="detail-icon">🔄</div>
                <div className="detail-info">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">
                    {new Date(department.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-actions">
          <button
            className="btn-edit-detail"
            onClick={() => navigate("/add-department", { state: { dept: department } })}
          >
            ✏️ Edit Department
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetails;