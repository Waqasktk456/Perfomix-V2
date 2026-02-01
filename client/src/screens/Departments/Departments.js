import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Department.css";
import { EditIcon, DeleteIcon, NoDepartmentImg } from "../../assets";
import '../../styles/typography.css';
import axios from 'axios';

const Departments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

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
      <button className="add-department-btn" onClick={() => navigate("/add-department")}>
        Add Department
      </button>

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
        <>
          <table className="departments-table">
            <thead>
              <tr>
                <th>Department Code</th>
                <th>Department Name</th>
                <th>Department Type</th>
                <th>HOD</th>
                <th>No of Employees</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr
                  key={dept.id || dept.department_code}
                  onClick={() => handleRowClick(dept)}
                  className={selectedDepartment?.department_code === dept.department_code ? 'selected-row' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{dept.department_code}</td>
                  <td>{dept.department_name}</td>
                  <td>{dept.department_type}</td>
                  <td>{dept.hod || 'N/A'}</td>
                  <td>{dept.number_of_employees}</td>
                  <td>
                    <a href={`mailto:${dept.department_email}`}>
                      {dept.department_email}
                    </a>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(dept)}
                      className="organization-icon-button"
                      aria-label="Edit Department"
                      title="Edit Department"
                    >
                      <img
                        src={EditIcon}
                        alt="Edit"
                        className="organization-icon organization-edit-icon"
                      />
                    </button>
                    <span>/</span>
                    <button
                      onClick={() => handleDelete(dept)}
                      className="organization-icon-button"
                      aria-label="Delete Department"
                      title="Delete Department"
                    >
                      <img
                        src={DeleteIcon}
                        alt="Delete"
                        className="organization-icon organization-delete-icon"
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            className="organization-view-details-btn"
            onClick={handleViewDetails}
            disabled={!selectedDepartment}
            style={{
              opacity: selectedDepartment ? 1 : 0.5,
              cursor: selectedDepartment ? 'pointer' : 'not-allowed'
            }}
          >
            View Details
          </button>
        </>
      )}
    </div>
  );
};

export default Departments;