import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./EvaluateEmployeeAll.css";
import "../screens/EvaluateEmployee.css";

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
    <div className="evaluation-container" style={{ margin: "-20px", padding: "0" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 0", background: "#f8f9fa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <button onClick={() => navigate(-1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ‹
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#111827" }}>Performance Evaluation</h1>
            <p style={{ margin: "4px 0 0", fontSize: "15px", color: "#6b7280" }}>Review and rate employee performance parameters</p>
          </div>
        </div>

        {/* Team card */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", borderTop: "6px solid #003366", padding: "22px 28px", display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px", height: "207px" }}>
          <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "700", color: "#2563eb", flexShrink: 0, marginTop: "18px" }}>
            {teamInfo.teamName ? teamInfo.teamName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "T"}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 10px", fontFamily: "'Outfit', sans-serif", fontSize: "24px", lineHeight: "32px", fontWeight: "700", letterSpacing: "-0.6px", color: "#2B0F17" }}>
              {teamInfo.teamName}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr", gap: "6px 4px" }}>
              <span><span style={{ marginRight: "6px" }}>🏢</span><strong className="emp-info-label">Department: </strong><span className="emp-info-value">{teamInfo.department}</span></span>
              <span><span style={{ marginRight: "6px" }}>📋</span><strong className="emp-info-label">Matrix: </strong><span className="emp-matrix-badge">{teamInfo.matrixName}</span></span>
              <span><span style={{ marginRight: "6px" }}>👥</span><strong className="emp-info-label">Members: </strong><span className="emp-info-value">{employees.length}</span></span>
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0, minWidth: "200px", background: "#F1F5F9", borderRadius: "10px", padding: "14px 18px", alignSelf: "center", marginLeft: "-60px", marginTop: "18px" }}>
            <p className="emp-info-label" style={{ margin: "0 0 4px" }}>Team Progress</p>
            <p className="emp-info-value" style={{ margin: "0 0 8px", fontSize: "28px", fontWeight: "700", lineHeight: 1 }}>
              {employees.length > 0 ? Math.round(employees.reduce((s, e) => s + (e.progress || 0), 0) / employees.length) : 0}
              <span style={{ fontSize: "14px", fontWeight: "400" }}>%</span>
            </p>
            <div style={{ width: "100%", height: "5px", background: "#e5e7eb", borderRadius: "3px" }}>
              <div style={{ width: `${employees.length > 0 ? Math.round(employees.reduce((s, e) => s + (e.progress || 0), 0) / employees.length) : 0}%`, height: "100%", background: "#003366", borderRadius: "3px" }} />
            </div>
            <p className="emp-info-value" style={{ margin: "5px 0 0", fontSize: "12px" }}>avg completion</p>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div style={{ padding: "0 20px 20px" }}>
      <table className="employee-table eval-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>SR No</th>
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
            employees.map((emp, index) => (
              <tr key={emp.employee_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "15px", textAlign: "center" }}>{index + 1}</td>
                <td className="eval-param-name">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "8px" }}>
                    {emp.profile_image ? (
                      <img
                        src={emp.profile_image.startsWith('/uploads') ? `http://localhost:5000${emp.profile_image}` : emp.profile_image}
                        alt={emp.name}
                        style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", fontWeight: "700", flexShrink: 0 }}>
                        {emp.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div>{emp.name}</div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "400" }}>{emp.designation}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "15px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                    <div style={{ width: "80px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden", height: "6px" }}>
                      <div style={{ width: `${emp.progress}%`, background: "#003366", height: "100%", transition: "width 0.3s ease" }} />
                    </div>
                    <span className="eval-weighted-score" style={{ fontSize: "13px" }}>{emp.progress}%</span>
                  </div>
                </td>
                <td style={{ padding: "15px", textAlign: "center" }}>
                  <span className="eval-weightage-badge" style={{ width: "auto", padding: "0 12px", background: emp.status === 'completed' ? "#dcfce7" : "#fef9c3", color: emp.status === 'completed' ? "#16a34a" : "#b45309" }}>
                    {getStatusText(emp.status)}
                  </span>
                </td>
                <td style={{ padding: "15px", textAlign: "center" }}>
                  <button
                    onClick={() => handleEvaluateClick(emp)}
                    className={emp.status === 'completed' ? "eval-back-btn" : "eval-submit-btn"}
                    style={{ width: "auto", padding: "0 12px", fontSize: "13px", height: "36px" }}
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
      <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="eval-back-btn" onClick={() => navigate(-1)}>Back to List</button>
      </div>
      </div>
    </div>
  );
};

export default EvaluateEmployeeAll;