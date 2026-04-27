import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import "./department-performance.css";
import "../Employees/Employees.css";

const DepartmentPerformance = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const filtered = cyclesData.filter(c => c.status !== 'draft');
      setCycles(filtered);
      if (filtered.length > 0) {
        const saved = sessionStorage.getItem('dept_perf_cycle_id');
        const savedId = saved ? Number(saved) : null;
        const toSelect = (savedId && filtered.find(c => c.id === savedId)) ? savedId : filtered[0].id;
        setSelectedCycleId(toSelect);
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
        const deptMap = {};
        evaluations.forEach((emp) => {
          const deptName = emp.Department_name || "Unknown";
          if (!deptMap[deptName]) {
            deptMap[deptName] = { name: deptName, teams: new Set(), employees: [], scores: [] };
          }
          if (emp.Team_name) deptMap[deptName].teams.add(emp.Team_name);
          deptMap[deptName].employees.push(emp);
          deptMap[deptName].scores.push(Number(emp.overall_weighted_score) || 0);
        });

        const deptsData = Object.values(deptMap).map((dept, index) => ({
          srNo: index + 1,
          name: dept.name,
          teamCount: dept.teams.size,
          employeeCount: dept.employees.length,
          averageScore: (dept.scores.reduce((a, b) => a + b, 0) / dept.scores.length).toFixed(2),
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

  const navigateToDept = (dept) => {
    sessionStorage.setItem('dept_perf_cycle_id', selectedCycleId);
    navigate("/department-performance-report", {
      state: {
        dept_name: dept.name,
        employee_count: dept.employeeCount,
        team_count: dept.teamCount,
        average_score: dept.averageScore,
        cycle_id: selectedCycleId,
        cycle_name: cycles.find(c => c.id === selectedCycleId)?.name || cycles.find(c => c.id === selectedCycleId)?.cycle_name || "Current Cycle",
      }
    });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="department-performance-container">
      <div className="cycle-selection-container">
        <label htmlFor="cycle-select" className="cycle-label">Evaluation Cycle:</label>
        <select
          id="cycle-select"
          className="cycle-dropdown"
          value={selectedCycleId || ""}
          onChange={(e) => { const id = Number(e.target.value); setSelectedCycleId(id); sessionStorage.setItem('dept_perf_cycle_id', id); }}
        >
          <option value="">Select Evaluation Cycle</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>{cycle.name || cycle.cycle_name}</option>
          ))}
        </select>
      </div>

      {/* Departments Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
        {/* Fixed Header Table */}
        <table className="report-table employees-table" style={{ marginBottom: 0 }}>
          <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: 16, fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Department Name</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Teams</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Employees</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Average Score</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Action</th>
            </tr>
          </thead>
        </table>
        {/* Scrollable Body */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
          <table className="report-table employees-table" style={{ marginTop: 0 }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                  No departments found for this cycle
                </td>
              </tr>
            ) : (
              departments.map((dept, index) => (
                <tr
                  key={index}
                  onClick={() => navigateToDept(dept)}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f4ff'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <td style={{ fontWeight: 700, color: '#1e3a5f', textAlign: 'left', paddingLeft: 16 }}>{dept.name}</td>
                  <td style={{ textAlign: 'center' }}>{dept.teamCount}</td>
                  <td style={{ textAlign: 'center' }}>{dept.employeeCount}</td>
                  <td style={{ textAlign: 'center' }}>{dept.averageScore}</td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button
                      title="View Performance"
                      onClick={() => navigateToDept(dept)}
                      className="organization-icon-button action-btn-view"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button
                      title="Download Department Report"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const config = { headers: { Authorization: `Bearer ${token}` } };
                          const response = await axios.get(`http://localhost:5000/api/reports/department?dept_name=${encodeURIComponent(dept.name)}&cycle_id=${selectedCycleId}`, config);
                          if (response.data.success) {
                            toast.info(`Generating report for ${dept.name}...`);
                            await generateProfessionalPDF(response.data, 'department-report');
                            toast.success("Department report downloaded");
                          } else {
                            throw new Error(response.data.message || "Failed to fetch report data");
                          }
                        } catch (error) {
                          console.error('Department report error:', error);
                          console.error('Error details:', error.response?.data);
                          toast.error(error.response?.data?.message || "Failed to generate department report");
                        }
                      }}
                      className="organization-icon-button action-btn-view"
                      style={{ marginLeft: '4px' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentPerformance;
