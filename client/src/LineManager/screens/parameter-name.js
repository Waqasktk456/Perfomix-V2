import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Profile1 from "../../assets/images/profile1.png";
import "./ParameterName.css";
import axios from "axios";
import { toast } from 'react-toastify';

const ParameterName = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("All");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fallback to localStorage for navigation state
  let navState = location.state;
  if (!navState) {
    const saved = localStorage.getItem('parameterNameState');
    if (saved) navState = JSON.parse(saved);
  }
  const department = navState?.department;
  const parameterName = navState?.parameterName;
  const matrixName = navState?.matrixName;
  const matrixId = navState?.matrixId;
  const parameterId = navState?.parameterId;

  // Use the correct parameterId for the current parameter page
  const currentParameterId = parameterId;

  // Function to get initials from name
  const getInitials = (firstName, lastName) => {
    if (!firstName || !lastName) return '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Move fetchEmployees to top-level so it's accessible in all useEffects
  const fetchEmployees = async () => {
    try {
      console.log("Department code for employee fetch:", department);
      if (!department) {
        setEmployees([]);
        return;
      }

      const response = await axios.get(`http://localhost:5000/api/employees/department/${department}`);
      console.log("API response for employees:", response.data);
      // Fetch evaluation status for each employee/parameter
      const mappedEmployees = await Promise.all(response.data.map(async emp => {
        let status = 'Pending';
        try {
          const statusRes = await axios.get(`http://localhost:5000/api/evaluations/status/${emp.Employee_id}/${currentParameterId}/${matrixId}`);
          console.log('Status API response:', statusRes.data, emp.Employee_id, currentParameterId, matrixId);
          status = statusRes.data.status === 'Completed' ? 'Completed' : 'Pending';
        } catch (err) {
          // If error, keep as Pending
        }
        return {
          id: emp.Employee_id,
          name: `${emp.First_name} ${emp.Last_name}`,
          department: emp.Department_name,
          designation: emp.Designation,
          status,
          action: status === 'Completed' ? 'Download Report' : 'Evaluate',
          profilePic: emp.Profile_image || null,
          initials: getInitials(emp.First_name, emp.Last_name)
        };
      }));
      setEmployees(mappedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [department]);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchEmployees();
    }
  }, [location.state]);

  // Add function to fetch evaluation status
  const fetchEvaluationStatus = async (employeeId, parameterId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/evaluations/status/${employeeId}/${parameterId}`);
      return response.data.status === 'submitted' ? 'Completed' : 'Pending';
    } catch (error) {
      console.error('Error fetching evaluation status:', error);
      return 'Pending';
    }
  };

  // Update employees status after evaluation
  const updateEmployeeStatus = (employeeId) => {
    setEmployees(prevEmployees => prevEmployees.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          status: 'Completed',
          action: 'Download Report'
        };
      }
      return emp;
    }));
  };

  const filteredEmployees = employees.filter(emp => {
    if (activeTab === "All") return true;
    return emp.status === activeTab;
  });

  const handleNavigate = (employee) => {
    console.log('Navigating to evaluate-employee with:', { employee, parameterName, matrixName, matrixId, parameterId });
    if (!employee || !parameterName || !matrixName || !matrixId || !parameterId) {
      toast.error('Required evaluation data is missing. Please try again from the beginning.');
      return;
    }
    const navState = {
      employee,
      parameterName,
      matrixName,
      matrixId,
      parameterId
    };
    localStorage.setItem('evaluateEmployeeState', JSON.stringify(navState));
    navigate('/evaluate-employee', { state: navState });
  };

  const handleRowClick = (employee) => {
    setSelectedEmployee(employee);
    handleNavigate(employee);
  };

  const handleViewProfile = () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }
    localStorage.setItem('selectedEmployee', JSON.stringify(selectedEmployee));
    navigate("/employee-viewprofile", { state: { employee: selectedEmployee } });
  };

  // Show a user-friendly error if department is missing
  if (!department) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#d32f2f' }}>Department information is missing.</h2>
        <p style={{ margin: '20px 0' }}>
          This page was accessed without all the necessary data. Please use the application workflow to select a department.<br/>
          If you believe this is a mistake, try going back and selecting the parameter again.
        </p>
        <button
          style={{ padding: '10px 24px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer' }}
          onClick={() => navigate('/performance-evaluation')}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 40, fontSize: 20 }}>Loading employee statuses...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>Performance Evaluation</span> <span className="separator">›</span>
        <span className="active">{location.state?.parameterName || "Parameter Name"}</span>
      </div>

      {/* Tabs */}
      <div className="employee-filters">
        {["All", "Pending", "Completed"].map((tab) => (
          <span
            key={tab}
            className={`tab ${activeTab === tab ? "active-tab" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="employee-table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Profile</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Evaluation Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, index) => (
              <tr
                key={index}
                className={`clickable-row ${selectedEmployee?.id === emp.id ? 'selected-row' : ''}`}
                onClick={() => handleNavigate(emp)}
              >
                <td
                  onClick={e => { e.stopPropagation(); setSelectedEmployee(emp); }}
                  style={{ cursor: 'pointer' }}
                >
                  {emp.id}
                </td>
                <td>
                  {emp.profilePic ? (
                    <img src={emp.profilePic} alt={emp.name} className="profile-pic" />
                  ) : (
                    <div className="profile-initials">{emp.initials}</div>
                  )}
                </td>
                <td>{emp.name}</td>
                <td>{emp.department}</td>
                <td>{emp.designation}</td>
                <td className={emp.status === "Completed" ? "status-completed" : "status-pending"}>
                  {emp.status}
                </td>
                <td className={emp.status === "Completed" ? "action-download" : "action-reminder"}>
                  {emp.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Buttons */}
      <div className="button-container">
        <button className="view-profile" onClick={handleViewProfile}>View Profile</button>
        <button className="evaluate-all" onClick={() => navigate("/evaluate-employee-all")}>Evaluate All</button>
      </div>
    </div>
  );
};

export default ParameterName;
