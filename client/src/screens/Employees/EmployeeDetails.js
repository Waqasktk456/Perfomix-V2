import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./EmployeeDetails.css";
import axios from 'axios';
import { EmployeeRoleIcon, EmployeeuserIcon, SalaryIcon, EmployeeAdressIcon, ContactIcon } from "../../assets";

const EmployeeDetails = () => {
  const navigate = useNavigate();
  const { Employee_id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Token not found, please login");
      navigate('/login');
      throw new Error("No Token");
    }
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  useEffect(() => {
    if (Employee_id) fetchEmployeeDetails();
  }, [Employee_id]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();
      const response = await axios.get(`http://localhost:5000/api/employees/${Employee_id}`, config);
      setEmployee(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch employee details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading employee details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!employee) return <div className="error">Employee not found</div>;

  return (
    <div className="employee-details-container">
      <div className="employee-details-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-content">
          <h1>Employee Details</h1>
        </div>
      </div>

      <div className="employee-details-card">
        <div className="details-content">
          {/* Personal Information */}
          <div className="section-title">Personal Information</div>
          <div className="detail-group">
            <div className="detail-item">
              <div className="detail-icon">👤</div>
              <div className="detail-info">
                <span className="detail-label">Employee ID</span>
                <span className="detail-value">{employee.employee_code}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon"><img src={EmployeeuserIcon} alt="User Icon" /></div>
              <div className="detail-info">
                <span className="detail-label">Name</span>
                <span className="detail-value">{employee.first_name} {employee.last_name}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">📧</div>
              <div className="detail-info">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">
                  <a href={`mailto:${employee.email}`}>{employee.email}</a>
                </span>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="section-title">Job Details</div>
          <div className="detail-group">
            <div className="detail-item">
              <div className="detail-icon">🏢</div>
              <div className="detail-info">
                <span className="detail-label">Department</span>
                <span className="detail-value">{employee.department_name || 'N/A'}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">💼</div>
              <div className="detail-info">
                <span className="detail-label">Designation</span>
                <span className="detail-value">{employee.designation || 'N/A'}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon"><img src={EmployeeRoleIcon} alt="Role Icon" /></div>
              <div className="detail-info">
                <span className="detail-label">Role</span>
                <span className="detail-value">{employee.role || 'N/A'}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">📅</div>
              <div className="detail-info">
                <span className="detail-label">Joining Date</span>
                <span className="detail-value">{employee.joining_date || 'N/A'}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">📋</div>
              <div className="detail-info">
                <span className="detail-label">Employment Status</span>
                <span className="detail-value">{employee.employment_status || 'N/A'}</span>
              </div>
            </div>


          </div>

        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;
