import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import "./team-performance.css";
import "../Employees/Employees.css";

const DEPT_BADGE_COLORS = [
  { bg: '#e8f0fe', text: '#4a6fa5' }, { bg: '#e8f5e9', text: '#4a7c59' },
  { bg: '#fef9e7', text: '#8a7340' }, { bg: '#f3e8ff', text: '#7a5fa5' },
  { bg: '#e0f7fa', text: '#3d7a82' }, { bg: '#fce4ec', text: '#a05070' },
  { bg: '#fff3e0', text: '#8a6040' }, { bg: '#e8eaf6', text: '#5560a0' },
];
const getDeptBadgeColor = (dept = '') => {
  let h = 0;
  for (let i = 0; i < dept.length; i++) h = dept.charCodeAt(i) + ((h << 5) - h);
  return DEPT_BADGE_COLORS[Math.abs(h) % DEPT_BADGE_COLORS.length];
};

const TeamPerformance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const teamFromState = location.state;
  const isAdminView = teamFromState?.isAdminView || false;
  
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchTeams();
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
      
      // If team data is passed from line manager, use that cycle, otherwise use latest
      if (teamFromState && teamFromState.cycle_id) {
        setSelectedCycleId(teamFromState.cycle_id);
      } else if (filtered.length > 0) {
        const saved = sessionStorage.getItem('team_perf_cycle_id');
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

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `http://localhost:5000/api/evaluations/all-status?cycle_id=${selectedCycleId}`,
        config
      );

      if (response.data.success || Array.isArray(response.data)) {
        const evaluations = Array.isArray(response.data) ? response.data : response.data.data || [];

        // Group by team
        const teamMap = {};
        evaluations.forEach((emp) => {
          const teamName = emp.Team_name || "Unknown";
          if (!teamMap[teamName]) {
            teamMap[teamName] = {
              name: teamName,
              department: emp.Department_name || "Unknown",
              team_id: emp.team_id,
              employees: [],
              scores: [],
            };
          }
          teamMap[teamName].employees.push(emp);
          teamMap[teamName].scores.push(Number(emp.overall_weighted_score) || 0);
        });

        // Calculate averages and format
        const teamsData = Object.values(teamMap).map((team, index) => ({
          srNo: index + 1,
          name: team.name,
          department: team.department,
          team_id: team.team_id,
          employeeCount: team.employees.length,
          averageScore: (team.scores.reduce((a, b) => a + b, 0) / team.scores.length).toFixed(2),
          trend: "→",
        }));

        setTeams(teamsData);
        
        // If team data is passed from line manager, auto-select that team
        if (teamFromState && teamFromState.team_name) {
          const matchedTeam = teamsData.find(t => t.name === teamFromState.team_name);
          if (matchedTeam) {
            setSelectedTeam(matchedTeam);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to fetch team data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const navigateToTeam = async (team) => {
    sessionStorage.setItem('team_perf_cycle_id', selectedCycleId);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`http://localhost:5000/api/evaluations/all-status?cycle_id=${selectedCycleId}`, config);
      const evaluations = Array.isArray(response.data) ? response.data : response.data.data || [];
      const teamEmployees = evaluations.filter(emp => emp.Team_name === team.name);
      let realAssignmentId = null;
      try {
        const assignRes = await axios.get(`http://localhost:5000/api/cycle-assignments/${selectedCycleId}`, config);
        const assignments = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data.data || []);
        const match = assignments.find(a => Number(a.team_id) === Number(team.team_id));
        if (match) realAssignmentId = match.id || match.assignment_id;
      } catch (e) {}
      navigate("/adminview-teams-performance", {
        state: {
          assignment_id: realAssignmentId,
          team_id: team.team_id,
          team_name: team.name,
          department_name: team.department,
          employee_count: team.employeeCount,
          completed_evaluations: teamEmployees.filter(e => e.evaluation_status === "Complete").length,
          pending_evaluations: teamEmployees.filter(e => e.evaluation_status === "Pending").length,
          avg_performance_score: team.averageScore,
          matrix_name: "Performance Matrix",
          matrix_id: 1,
          cycle_id: selectedCycleId,
          cycle_name: cycles.find(c => c.id === selectedCycleId)?.name || "Current Cycle",
          top_performer: null, low_performer: null, last_activity: null,
          employees: teamEmployees.map(emp => ({
            employee_id: emp.Employee_id,
            name: `${emp.First_name} ${emp.Last_name}`,
            designation: emp.Designation,
            email: emp.Email,
            profile_image: emp.Profile_image,
            status: emp.evaluation_status === "Complete" ? "completed" : "draft",
            progress: emp.evaluation_status === "Complete" ? 100 : 0,
            overall_score: emp.overall_weighted_score,
            evaluation_id: emp.id,
            total_params: 0
          }))
        }
      });
    } catch (error) {
      toast.error("Failed to load team employees");
    }
  };

  return (
    <div className="team-performance-container">
      {/* Cycle Selector */}
      <div className="cycle-selection-container">
        <label htmlFor="cycle-select" className="cycle-label">
          Evaluation Cycle:
        </label>
        <select
          id="cycle-select"
          className="cycle-dropdown"
          value={selectedCycleId || ""}
          onChange={(e) => { const id = Number(e.target.value); setSelectedCycleId(id); sessionStorage.setItem('team_perf_cycle_id', id); }}
        >
          <option value="">Select Evaluation Cycle</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name || cycle.cycle_name}
            </option>
          ))}
        </select>
      </div>

      {/* Teams Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
        {/* Fixed Header Table */}
        <table className="report-table employees-table" style={{ marginBottom: 0 }}>
          <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: 16, fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Team Name</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Department</th>
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
              <col style={{ width: '25%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                  No teams found for this cycle
                </td>
              </tr>
            ) : (
              teams.map((team, index) => {
                const deptColor = getDeptBadgeColor(team.department || '');
                return (
                  <tr
                    key={index}
                    onClick={() => navigateToTeam(team)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f4ff'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td style={{ fontWeight: 700, color: '#1e3a5f', textAlign: 'left', paddingLeft: 16 }}>{team.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      {team.department ? (
                        <span className="dept-badge" style={{ background: deptColor.bg, color: deptColor.text }}>{team.department}</span>
                      ) : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{team.employeeCount}</td>
                    <td style={{ textAlign: 'center' }}>{team.averageScore}</td>
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        title="View Team Performance"
                        onClick={() => navigateToTeam(team)}
                        className="organization-icon-button action-btn-view"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button
                        title="Download Team Report"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const config = { headers: { Authorization: `Bearer ${token}` } };
                            
                            // Fetch assignment_id for this team
                            let assignmentId = null;
                            try {
                              const assignRes = await axios.get(`http://localhost:5000/api/cycle-assignments/${selectedCycleId}`, config);
                              const assignments = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data.data || []);
                              const match = assignments.find(a => Number(a.team_id) === Number(team.team_id));
                              if (match) assignmentId = match.id || match.assignment_id;
                            } catch (e) {
                              console.error('Error fetching assignment:', e);
                              toast.error('Could not find team assignment');
                              return;
                            }
                            
                            if (!assignmentId) {
                              toast.error('Could not find team assignment for this cycle');
                              return;
                            }
                            
                            const response = await axios.get(`http://localhost:5000/api/reports/team?assignment_id=${assignmentId}`, config);
                            if (response.data.success) {
                              toast.info(`Generating report for ${team.name}...`);
                              await generateProfessionalPDF(response.data, 'team-report');
                              toast.success("Team report downloaded");
                            } else {
                              throw new Error(response.data.message || "Failed to fetch report data");
                            }
                          } catch (error) {
                            console.error('Team report error:', error);
                            console.error('Error details:', error.response?.data);
                            toast.error(error.response?.data?.message || "Failed to generate team report");
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
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamPerformance;
