import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import "./team-performance.css";

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
        setSelectedCycleId(filtered[0].id);
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

      {/* Teams Table */}
      <div className="table-container-scroll">
        <table className="report-table">
          <thead>
            <tr>
              <th>SR NO</th>
              <th>Team Name</th>
              <th>Department</th>
              <th>Employees</th>
              <th>Average Score</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                  No teams found for this cycle
                </td>
              </tr>
            ) : (
              teams.map((team, index) => (
                <tr
                  key={index}
                  className={selectedTeam && selectedTeam.srNo === team.srNo ? "highlighted-row" : ""}
                  onClick={() => setSelectedTeam(team)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{team.srNo}</td>
                  <td>{team.name}</td>
                  <td>{team.department}</td>
                  <td>{team.employeeCount}</td>
                  <td>{team.averageScore}</td>
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
            if (selectedTeam) {
              // Fetch employees for this team in the selected cycle
              const fetchTeamEmployees = async () => {
                try {
                  const token = localStorage.getItem("token");
                  const config = { headers: { Authorization: `Bearer ${token}` } };
                  const response = await axios.get(
                    `http://localhost:5000/api/evaluations/all-status?cycle_id=${selectedCycleId}`,
                    config
                  );

                  const evaluations = Array.isArray(response.data) ? response.data : response.data.data || [];
                  
                  // Filter employees for this team
                  const teamEmployees = evaluations.filter(emp => emp.Team_name === selectedTeam.name);
                  
                  // Get the real assignment_id from cycle_team_assignments
                  let realAssignmentId = null;
                  try {
                    const assignRes = await axios.get(
                      `http://localhost:5000/api/cycle-assignments/${selectedCycleId}`,
                      config
                    );
                    const assignments = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data.data || []);
                    const match = assignments.find(a => Number(a.team_id) === Number(selectedTeam.team_id));
                    if (match) realAssignmentId = match.id || match.assignment_id;
                  } catch (e) {
                    console.warn('Could not fetch assignment_id:', e.message);
                  }

                  const navigationPath = "/adminview-teams-performance";
                  
                  navigate(navigationPath, {
                    state: {
                      assignment_id: realAssignmentId,
                      team_id: selectedTeam.team_id,
                      team_name: selectedTeam.name,
                      department_name: selectedTeam.department,
                      employee_count: selectedTeam.employeeCount,
                      completed_evaluations: teamEmployees.filter(e => e.evaluation_status === "Complete").length,
                      pending_evaluations: teamEmployees.filter(e => e.evaluation_status === "Pending").length,
                      avg_performance_score: selectedTeam.averageScore,
                      matrix_name: "Performance Matrix",
                      matrix_id: 1,
                      cycle_id: selectedCycleId,
                      cycle_name: cycles.find(c => c.id === selectedCycleId)?.name || "Current Cycle",
                      top_performer: null,
                      low_performer: null,
                      last_activity: null,
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
              
              fetchTeamEmployees();
            }
          }}
          disabled={!selectedTeam}
        >
          View Team Details
        </button>
      </div>
    </div>
  );
};

export default TeamPerformance;
