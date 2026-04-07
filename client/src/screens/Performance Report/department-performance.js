import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "./department-performance.css";

const DepartmentPerformance = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchDepartments();
    }
  }, [selectedCycleId]);

  const fetchCycles = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get("http://localhost:5000/api/cycles", config);
      const cyclesData = Array.isArray(response.data) ? response.data : [];
      setCycles(cyclesData);
      if (cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching cycles:", error);
      toast.error("Failed to fetch evaluation cycles");
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `http://localhost:5000/api/evaluations/all-status?cycle_id=${selectedCycleId}`,
        config
      );

      if (response.data.success || Array.isArray(response.data)) {
        const evaluations = Array.isArray(response.data) ? response.data : response.data.data || [];

        // Group by department
        const deptMap = {};
        evaluations.forEach((emp) => {
          const deptName = emp.Department_name || "Unknown";
          if (!deptMap[deptName]) {
            deptMap[deptName] = {
              name: deptName,
              teams: new Set(),
              employees: [],
              scores: [],
            };
          }
          if (emp.Team_name) {
            deptMap[deptName].teams.add(emp.Team_name);
          }
          deptMap[deptName].employees.push(emp);
          deptMap[deptName].scores.push(Number(emp.overall_weighted_score) || 0);
        });

        // Calculate averages and format
        const deptsData = Object.values(deptMap).map((dept, index) => ({
          srNo: index + 1,
          name: dept.name,
          teamCount: dept.teams.size,
          employeeCount: dept.employees.length,
          averageScore: (dept.scores.reduce((a, b) => a + b, 0) / dept.scores.length).toFixed(2),
          trend: "→", // Placeholder for trend
        }));

        setDepartments(deptsData);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to fetch department data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="department-performance-container">
      {/* Cycle Selector */}
      <div className="cycle-selection-container">
        <label htmlFor="cycle-select" className="cycle-label">
          Evaluation Cycle:
        </label>
        <select
          id="cycle-select"
          className="cycle-dropdown"
          value={selectedCycleId || ""}
          onChange={(e) => setSelectedCycleId(Number(e.target.value))}
        >
          <option value="">Select Evaluation Cycle</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name || cycle.cycle_name}
            </option>
          ))}
        </select>
      </div>

      {/* Departments Table */}
      <div className="table-container-scroll">
        <table className="report-table">
          <thead>
            <tr>
              <th>SR NO</th>
              <th>Department Name</th>
              <th>Teams</th>
              <th>Employees</th>
              <th>Average Score</th>
              <th>Trend</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px" }}>
                  No departments found for this cycle
                </td>
              </tr>
            ) : (
              departments.map((dept, index) => (
                <tr
                  key={index}
                  className={selectedDepartment && selectedDepartment.srNo === dept.srNo ? "highlighted-row" : ""}
                  onClick={() => setSelectedDepartment(dept)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{dept.srNo}</td>
                  <td>{dept.name}</td>
                  <td>{dept.teamCount}</td>
                  <td>{dept.employeeCount}</td>
                  <td>{dept.averageScore}</td>
                  <td>{dept.trend}</td>
                  <td className="action-view">View</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Buttons */}
      <div className="bottom-buttons">
        <button
          className="view-btn"
          onClick={() => {
            if (selectedDepartment) {
              navigate("/department-performance-report", {
                state: {
                  dept_name: selectedDepartment.name,
                  employee_count: selectedDepartment.employeeCount,
                  team_count: selectedDepartment.teamCount,
                  average_score: selectedDepartment.averageScore,
                  cycle_id: selectedCycleId,
                  cycle_name: cycles.find(c => c.id === selectedCycleId)?.name || cycles.find(c => c.id === selectedCycleId)?.cycle_name || "Current Cycle",
                }
              });
            }
          }}
          disabled={!selectedDepartment}
        >
          View Department Details
        </button>
      </div>
    </div>
  );
};

export default DepartmentPerformance;
