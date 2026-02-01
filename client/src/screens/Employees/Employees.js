import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Employees.css";
import { EditIcon, DeleteIcon, NoDepartmentImg } from "../../assets";
import '../../styles/typography.css';

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // SEARCH STATES
  const [searchType, setSearchType] = useState("name");
  const [searchValue, setSearchValue] = useState("");

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
  }, []);

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
        return emp.department_name?.toLowerCase().includes(value);

      default:
        return true;
    }
  });

  if (loading) {
    return <div className="loading">Loading employees...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <button className="add-employee-btn" onClick={() => navigate("/add-employee")}>
        Add Employee
      </button>

      {/* SEARCH BAR */}
      <div className="search-container-main">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input-field"
            placeholder={`Search by ${searchType}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        <div className="search-type-buttons">
          <button
            className={`search-type-btn ${searchType === 'name' ? 'active' : ''}`}
            onClick={() => setSearchType('name')}
          >
            Name
          </button>
          <button
            className={`search-type-btn ${searchType === 'department' ? 'active' : ''}`}
            onClick={() => setSearchType('department')}
          >
            Department
          </button>
          <button
            className={`search-type-btn ${searchType === 'designation' ? 'active' : ''}`}
            onClick={() => setSearchType('designation')}
          >
            Designation
          </button>
        </div>
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
            <table className="employees-table">
              <thead>
                <tr>
                  <th>SR No</th>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Action</th>
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
                  filteredEmployees.map((emp, index) => (
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
                      <td>{index + 1}</td>
                      <td>{emp.employee_code || "N/A"}</td>
                      <td>{emp.first_name} {emp.last_name}</td>
                      <td><a href={`mailto:${emp.email}`}>{emp.email}</a></td>
                      <td>{emp.role}</td>
                      <td>{emp.department_name || "N/A"}</td>
                      <td>
                        <span className={`status-badge ${emp.is_active ? 'active' : 'inactive'}`}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(emp)}
                          className="organization-icon-button"
                        >
                          <img
                            src={EditIcon}
                            alt="Edit"
                            className="organization-icon organization-edit-icon"
                          />
                        </button>

                        <span>/</span>

                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="organization-icon-button"
                        >
                          <img
                            src={DeleteIcon}
                            alt="Delete"
                            className="organization-icon organization-delete-icon"
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <button
              className="organization-view-details-btn"
              onClick={handleViewDetails}
              disabled={!selectedEmployee}
              style={{
                opacity: selectedEmployee ? 1 : 0.5,
                cursor: selectedEmployee ? 'pointer' : 'not-allowed',
                position: "fixed",
                bottom: 20,
                right: 20,
              }}
            >
              View Details
            </button>
          </>
        )
        }
      </div >
      );
};

      export default Employees;