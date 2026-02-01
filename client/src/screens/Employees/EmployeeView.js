import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EmployeeView.css";

const EmployeeView = () => {
  const { Employee_id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
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
    const fetchEmployee = async () => {
      try {
        const config = getAuthConfig();
        const response = await axios.get(`http://localhost:5000/api/employees/${Employee_id}`, config);
        setEmployee(response.data.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching employee:', err);
        if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
          navigate('/login');
        } else {
          setError('Failed to fetch employee details');
        }
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [Employee_id, navigate]);

  const handleEdit = () => {
    navigate(`/employees/${Employee_id}/edit`);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!employee) return <div className="error">Employee not found</div>;

  return (
    <div className="employee-container">
      <div className="nav-path">
        <span className="nav-item">Employee</span> &nbsp;›&nbsp;
        <span className="nav-active">View Employee</span>
      </div>

      <div className="employee-info">
        <h2>Employee Details</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Name:</span>
            <span className="info-value">{`${employee.first_name} ${employee.last_name}`}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email:</span>
            <span className="info-value">{employee.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Role:</span>
            <span className="info-value">{employee.role}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Department:</span>
            <span className="info-value">{employee.department_name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Designation:</span>
            <span className="info-value">{employee.designation}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Salary:</span>
            <span className="info-value">{employee.salary}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Contact:</span>
            <span className="info-value">{employee.primary_contact_number}</span>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="edit-btn" onClick={handleEdit}>Edit Details</button>
        <button 
          className="delete-btn"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this employee?')) {
              try {
                const config = getAuthConfig();
                await axios.delete(`http://localhost:5000/api/employees/${Employee_id}`, config);
                navigate('/employees');
              } catch (err) {
                console.error('Error deleting employee:', err);
                if (err.response?.status === 401) {
                  alert('Session expired. Please login again.');
                  navigate('/login');
                } else {
                  alert('Failed to delete employee');
                }
              }
            }
          }}
        >
          Delete Employee
        </button>
      </div>
    </div>
  );
};

export default EmployeeView;