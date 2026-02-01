import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./EvaluateEmployeeAll.css";

const EvaluateEmployeeAll = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState({});

  useEffect(() => {
    // Validate we have required data from dashboard
    if (!state.assignmentId || !state.teamId || !state.matrixId) {
      toast.error("Invalid team selection. Please go back to dashboard.");
      navigate("/linemanager-dashboard");
      return;
    }

    setTeamInfo({
      teamName: state.teamName || "Unknown Team",
      matrixName: state.matrixName || "Unknown Matrix",
      department: state.department || "N/A",
      employeeCount: state.employeeCount || 0,
    });

    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Session expired");
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/api/line-manager/team-employees/${state.assignmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to load employees");
        }

        setEmployees(response.data.employees || []);
        setLoading(false);
      } catch (err) {
        console.error("Error loading employees:", err);
        toast.error("Failed to load team members: " + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [location.state, navigate, state.assignmentId, state.teamId, state.matrixId]);

  const handleEvaluateClick = (employee) => {
    if (!employee.evaluation_id) {
      toast.error("Evaluation not initialized for this employee");
      return;
    }

    navigate("/evaluate-employee", {
      state: {
        evaluationId: employee.evaluation_id,
        employeeId: employee.employee_id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        designation: employee.designation,
        profileImage: employee.profile_image,
        matrixId: state.matrixId,
        matrixName: state.matrixName,
        teamName: state.teamName,
        progress: employee.progress,
        totalParams: employee.total_params,
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#28a745';
      case 'draft': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending';
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center" }}>
        Loading team members...
      </div>
    );
  }

  return (
    <div className="evaluation-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span onClick={() => navigate("/linemanager-dashboard")} style={{ cursor: "pointer" }}>
          Dashboard
        </span> ›
        <span className="active"> Evaluate Team Members</span>
      </div>

      {/* Team Header */}
      <div style={{ 
        background: "#f8f9fa", 
        borderRadius: "8px", 
        padding: "15px 20px",
        marginBottom: "20px" 
      }}>
        <h2 style={{ margin: "0 0 8px 0" }}>{teamInfo.teamName}</h2>
        <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
          <strong>Matrix:</strong> {teamInfo.matrixName} | 
          <strong> Department:</strong> {teamInfo.department} | 
          <strong> Members:</strong> {employees.length}
        </p>
      </div>

      {/* Employee Table */}
      <table className="employee-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Employee Name</th>
            <th>Progress</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                No employees found in this team
              </td>
            </tr>
          ) : (
            employees.map((emp) => (
              <tr key={emp.employee_id}>
                <td>{emp.employee_id}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {emp.profile_image ? (
                      <img 
                        src={emp.profile_image} 
                        alt={emp.name}
                        style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ 
                        width: "40px", 
                        height: "40px", 
                        borderRadius: "50%", 
                        background: "#007bff", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        color: "white", 
                        fontWeight: "bold" 
                      }}>
                        {emp.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: "600" }}>{emp.name}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>{emp.designation}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "100px", background: "#e9ecef", borderRadius: "10px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${emp.progress}%`, 
                          background: "#007bff", 
                          height: "8px",
                          transition: "width 0.3s ease"
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "14px" }}>{emp.progress}%</span>
                  </div>
                </td>
                <td>
                  <span 
                    style={{ 
                      padding: "6px 12px", 
                      borderRadius: "20px", 
                      background: getStatusColor(emp.status),
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}
                  >
                    {getStatusText(emp.status)}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleEvaluateClick(emp)}
                    className="submit-button"
                    style={{
                      padding: "8px 16px",
                      background: emp.status === 'completed' ? "#28a745" : "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    {emp.status === 'completed' ? 'View' : 'Evaluate'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Bottom Buttons */}
      <div className="button-container" style={{ marginTop: "30px" }}>
        <button 
          className="cancel-button"
          onClick={() => navigate("/linemanager-dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default EvaluateEmployeeAll;