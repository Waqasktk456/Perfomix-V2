import { useState, useEffect } from "react";
import "./Dashboard.css";
import { PieChart, Pie, Cell, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, BarChart } from "recharts";
import TotalEmployees from '../../assets/images/total-employee.png';
import NewHires from '../../assets/images/new-hires.png';
import TotalDepartment from '../../assets/images/total-department.png';
import PendingEvaluation from '../../assets/images/pending-evaluation.png';
import profilepic from '../../assets/images/ali.png';
import '../../styles/typography.css';
import { TrophyImg } from "../../assets";
import axios from "axios";

const Dashboard = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [newHires, setNewHires] = useState(0);
  const [totalDepartments, setTotalDepartments] = useState(0);
  const [pendingEvaluations, setPendingEvaluations] = useState(0);
  const [completedEvaluations, setCompletedEvaluations] = useState(0);
  const [topPerformers, setTopPerformers] = useState([]);
  const [topDepartment, setTopDepartment] = useState(null);
  const [lowestDepartment, setLowestDepartment] = useState(null);
  const [topTeam, setTopTeam] = useState(null);
  const [scoreDistribution, setScoreDistribution] = useState([]);
  const [deptCompletion, setDeptCompletion] = useState([]);
  const [employeesNeedingAttention, setEmployeesNeedingAttention] = useState([]);
  const [topTeamStrengths, setTopTeamStrengths] = useState([]);
  const [currentCycleId, setCurrentCycleId] = useState(null);
  const [allCycles, setAllCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);

  // Utility to filter unique employees by Employee_id
  const uniqueByEmployeeId = (arr) => {
    const seen = new Set();
    return arr.filter(emp => {
      const id = emp.Employee_id || emp.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // Fetch all cycles
    axios.get("http://localhost:5000/api/cycles", config).then(res => {
      const cyclesData = Array.isArray(res.data) ? res.data : (res.data.data || []);
      console.log('Fetched cycles:', cyclesData);
      setAllCycles(cyclesData);
      
      // Automatically select the most recent cycle (first in the list)
      if (cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0].id);
        setCurrentCycleId(cyclesData[0].id);
      }
    }).catch(err => console.log('Error fetching cycles:', err));

    // Fetch employees
    axios.get("http://localhost:5000/api/employees", config).then(res => {
      // Support both array response and { data: [] } response
      const employees = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setTotalEmployees(employees.length > 0 ? employees.length : 0); // Display actual count

      // New Hires: count employees added in last 7 days if created_at exists
      const now = new Date();
      const hires = employees.filter(emp => {
        if (!emp.created_at) return false;
        const created = new Date(emp.created_at);
        return (now - created) / (1000 * 60 * 60 * 24) <= 7;
      });
      setNewHires(hires.length);
    });
    // Fetch departments
    axios.get("http://localhost:5000/api/departments", config).then(res => {
      setTotalDepartments((res.data.data || res.data).length);
    });
  }, []);

  // Fetch evaluation data when selectedCycleId changes
  useEffect(() => {
    if (!selectedCycleId) return;

    const token = localStorage.getItem('token');
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // Fetch evaluation statuses for pie chart
    axios.get(`http://localhost:5000/api/evaluations/all-status?cycle_id=${selectedCycleId}`, config).then(async res => {
      // Support both array response and { data: [] } response
      const all = Array.isArray(res.data) ? res.data : (res.data.data || []);

      const updatedAll = all.map(emp => ({
        ...emp,
        overall_score: Number(emp.overall_weighted_score) || 0,
        evaluation_status: emp.evaluation_status || 'Pending'
      }));

      // Capture the first cycle ID found
      if (updatedAll.length > 0 && updatedAll[0].cycle_id) {
        setCurrentCycleId(updatedAll[0].cycle_id);
      }

      const completed = updatedAll.filter(e => e.evaluation_status === "Complete").length;
      const pending = updatedAll.filter(e => e.evaluation_status === "Pending").length;

      setCompletedEvaluations(completed);
      setPendingEvaluations(pending);

      // Remove duplicates
      const uniqueEvaluations = uniqueByEmployeeId(updatedAll);

      // Sort by overall_score descending and take top 3
      const sortedByScoreDesc = [...uniqueEvaluations].sort((a, b) => b.overall_score - a.overall_score);
      const topPerformersList = sortedByScoreDesc.slice(0, 3);
      setTopPerformers(topPerformersList);

      // Calculate department averages
      const deptMap = {};
      updatedAll.forEach(emp => {
        const dept = emp.Department_name || 'Unknown';
        if (!deptMap[dept]) {
          deptMap[dept] = { name: dept, scores: [], count: 0 };
        }
        deptMap[dept].scores.push(Number(emp.overall_weighted_score) || 0);
        deptMap[dept].count++;
      });

      // Calculate averages
      const deptAverages = Object.values(deptMap).map(dept => ({
        name: dept.name,
        avgScore: dept.scores.reduce((a, b) => a + b, 0) / dept.scores.length
      }));

      // Sort and get top and lowest
      const sorted = deptAverages.sort((a, b) => b.avgScore - a.avgScore);
      setTopDepartment(sorted[0] || null);
      setLowestDepartment(sorted[sorted.length - 1] || null);

      // Calculate team averages
      const teamMap = {};
      updatedAll.forEach(emp => {
        const team = emp.Team_name || 'Unknown';
        if (!teamMap[team]) {
          teamMap[team] = { 
            name: team, 
            scores: [], 
            count: 0,
            department: emp.Department_name || 'Unknown',
            team_id: emp.team_id,
            completed: 0
          };
        }
        teamMap[team].scores.push(Number(emp.overall_weighted_score) || 0);
        teamMap[team].count++;
        if (emp.evaluation_status === 'Complete') {
          teamMap[team].completed++;
        }
      });

      // Calculate team averages and get top team
      const teamAverages = Object.values(teamMap).map((team, index) => ({
        name: team.name,
        department: team.department,
        avgScore: team.scores.reduce((a, b) => a + b, 0) / team.scores.length,
        team_id: team.team_id,
        employeeCount: team.count,
        completedCount: team.completed,
        rank: index + 1
      }));

      const sortedTeams = teamAverages.sort((a, b) => b.avgScore - a.avgScore);
      const topTeamData = sortedTeams[0] || null;
      
      if (topTeamData) {
        // Fetch top 3 parameters for this team (use currentCycleId if available)
        const cycleToUse = currentCycleId || 'latest';
        axios.get(`http://localhost:5000/api/staff/team-top-parameters?teamId=${topTeamData.team_id}&cycleId=${cycleToUse}`, config)
          .then(res => {
            if (res.data.success && res.data.topParameters) {
              setTopTeamStrengths(res.data.topParameters);
            }
          })
          .catch(err => console.log('Error fetching team parameters:', err));
      }
      
      setTopTeam(topTeamData);

      // Calculate score distribution
      const ranges = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        '50-59': 0,
        '<50': 0
      };

      updatedAll.forEach(emp => {
        const score = Number(emp.overall_weighted_score) || 0;
        if (score >= 90) ranges['90-100']++;
        else if (score >= 80) ranges['80-89']++;
        else if (score >= 70) ranges['70-79']++;
        else if (score >= 60) ranges['60-69']++;
        else if (score >= 50) ranges['50-59']++;
        else ranges['<50']++;
      });

      const distributionData = Object.entries(ranges).map(([range, count]) => ({
        range,
        count,
        isHighest: false
      }));

      // Find the highest count to highlight
      const maxCount = Math.max(...distributionData.map(d => d.count));
      distributionData.forEach(d => {
        if (d.count === maxCount) d.isHighest = true;
      });

      setScoreDistribution(distributionData);

      // Calculate department completion
      const deptCompletionMap = {};
      updatedAll.forEach(emp => {
        const dept = emp.Department_name || 'Unknown';
        if (!deptCompletionMap[dept]) {
          deptCompletionMap[dept] = { total: 0, completed: 0 };
        }
        deptCompletionMap[dept].total++;
        if (emp.evaluation_status === 'Complete') {
          deptCompletionMap[dept].completed++;
        }
      });

      const completionData = Object.entries(deptCompletionMap).map(([dept, data]) => ({
        department: dept,
        total: data.total,
        completed: data.completed,
        percentage: Math.round((data.completed / data.total) * 100)
      })).sort((a, b) => b.percentage - a.percentage);

      setDeptCompletion(completionData);

      // Calculate employees needing attention
      const attentionList = [];
      
      updatedAll.forEach(emp => {
        const currentScore = Number(emp.overall_weighted_score) || 0;
        let reason = null;

        // Condition 1: Score below 60
        if (currentScore < 60) {
          reason = 'Low Performance';
        }
        // Condition 2: Score dropped by more than 10 points (would need previous cycle data)
        // For now, we'll check if there's a significant drop indicator
        else if (emp.previous_score && (emp.previous_score - currentScore) > 10) {
          reason = 'Declining Performance';
        }
        // Condition 3: Multiple weak parameters (rating < 3 or equivalent)
        // This would require parameter-level data, so we'll add a flag if available
        else if (emp.weak_parameters_count && emp.weak_parameters_count >= 2) {
          reason = 'Multiple Weak Parameters';
        }

        if (reason) {
          attentionList.push({
            id: emp.Employee_id,
            name: `${emp.First_name} ${emp.Last_name}`,
            department: emp.Department_name || 'Unknown',
            currentScore: Math.round(currentScore),
            previousScore: emp.previous_score ? Math.round(emp.previous_score) : null,
            reason: reason
          });
        }
      });

      // Sort by lowest score and take top 5
      const sortedAttention = attentionList.sort((a, b) => a.currentScore - b.currentScore).slice(0, 5);
      setEmployeesNeedingAttention(sortedAttention);
    });
  }, [selectedCycleId]);

  const totalEvaluations = completedEvaluations + pendingEvaluations;
  const completedPercent = totalEvaluations ? Math.round((completedEvaluations / totalEvaluations) * 100) : 0;
  const pendingPercent = totalEvaluations ? Math.round((pendingEvaluations / totalEvaluations) * 100) : 0;

  const data = [
    { name: "Completed", value: completedPercent, color: "#002F6C" },
    { name: "Pending", value: pendingPercent, color: "#E87722" },
  ];

  return (
    <div>
      {/* Stats Cards */}
      <div className="stats-container">
        {[{
          title: "Total Employees",
          count: totalEmployees,
          change: "⬆ Dynamic", // You can add logic for change if needed
          img: TotalEmployees
        }, {
          title: "New Hires",
          count: newHires,
          change: "⬆ Dynamic", // You can add logic for change if needed
          img: NewHires
        }, {
          title: "Total Departments",
          count: totalDepartments,
          change: "⬆ Dynamic", // You can add logic for change if needed
          img: TotalDepartment
        }, {
          title: "Pending Evaluations",
          count: pendingEvaluations,
          change: "⬆ Dynamic", // You can add logic for change if needed
          img: PendingEvaluation
        }].map((card, index) => (
          <div className="stats-card" key={index}>
            <div className="card-content">
              <div>
                <h3>{card.title}</h3>
                <p className="count">{card.count}</p>
                <p className={`change ${card.change.includes('⬇') ? 'down' : 'up'}`}>{card.change}</p>
              </div>
              <img src={card.img} alt={card.title} className="card-icon" />
            </div>
          </div>
        ))}
      </div>

      {/* Cycle Dropdown */}
      <div className="cycle-selection-container">
        <label htmlFor="cycle-select" className="cycle-label">
          Evaluation Cycle:
        </label>
        <select
          id="cycle-select"
          className="cycle-dropdown"
          value={selectedCycleId ? String(selectedCycleId) : ''}
          onChange={(e) => setSelectedCycleId(Number(e.target.value))}
        >
          {allCycles.length === 0 ? (
            <option value="">No cycles available</option>
          ) : (
            allCycles.map((cycle) => (
              <option key={cycle.id} value={String(cycle.id)}>
                {cycle.name}
              </option>
            ))
          )}
        </select>
      </div>



      {/* Center Cards */}
      <div className="center-cards">
        {/* Top Performer */}
        <div className="top-performer-card">
          <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 32, marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            Top Performers
            <img src={TrophyImg} alt="Trophy" style={{ width: 40, height: 40 }} />
          </h3>
          <div className="performers" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', marginTop: 10, gap: '20px' }}>
            {topPerformers.map((performer, index) => (
              <div key={index} className="performer" style={{ textAlign: 'center', width: 'calc(33.333% - 14px)', minWidth: '150px', maxWidth: '200px' }}>
                {performer ? (
                  <>
                    <p className="name" style={{ color: '#00bfae', fontWeight: 600, fontSize: 18, margin: 0, textAlign: 'center' }}>{performer.First_name} {performer.Last_name}</p>
                    <p className="role" style={{ color: '#a0aec0', fontWeight: 400, fontSize: 14, margin: 0, marginBottom: 10, textTransform: 'capitalize', textAlign: 'center' }}>{performer.Designation}</p>
                    <img src={performer.Profile_image || profilepic} alt={performer.First_name} className="performer-pic" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                    <p className="score" style={{ color: '#00bfae', fontWeight: 400, fontSize: 14, margin: 0, textAlign: 'center' }}>{Number.isFinite(performer?.overall_score) ? Math.round(performer.overall_score) : 0}</p>
                  </>
                ) : (
                  <div style={{ height: 100 }}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Evaluations Pie Chart */}
        <div className="evaluations-card">
          <h3>Evaluations</h3>
          <div className="chart-label complete-label">{completedPercent}% Evaluations are Complete</div>
          <div className="pie-chart-container">
            <PieChart width={180} height={180}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={70}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className="chart-label pending-label">{pendingPercent}% Evaluations are Pending</div>
          <div className="legend">
            <span className="legend-item"><span className="dot complete"></span> Completed</span>
            <span className="legend-item"><span className="dot pendingg"></span> Pending</span>
          </div>
        </div>
      </div>

      {/* Department Performance Cards */}
      <div className="center-cards" style={{ marginTop: '20px' }}>
        {/* Left Card: Department Performance */}
        <div className="top-performer-card" style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 24, marginBottom: 20 }}>Department Performance</h3>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-around' }}>
            {/* Top Department */}
            <div style={{ flex: 1, textAlign: 'center', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: 14, color: '#a0aec0', margin: '0 0 10px 0', fontWeight: 500 }}>Top Department</p>
              {topDepartment ? (
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#00bfae', margin: '5px 0' }}>{topDepartment.name}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#00bfae', margin: '10px 0' }}>{Math.round(topDepartment.avgScore)}</p>
                </div>
              ) : (
                <p style={{ color: '#999' }}>No data</p>
              )}
            </div>

            {/* Lowest Department */}
            <div style={{ flex: 1, textAlign: 'center', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: 14, color: '#a0aec0', margin: '0 0 10px 0', fontWeight: 500 }}>Lowest Department</p>
              {lowestDepartment ? (
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#ff6b6b', margin: '5px 0' }}>{lowestDepartment.name}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#ff6b6b', margin: '10px 0' }}>{Math.round(lowestDepartment.avgScore)}</p>
                </div>
              ) : (
                <p style={{ color: '#999' }}>No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Top Team */}
        <div className="top-performer-card" style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 24, marginBottom: 20, color: '#00bfae' }}>Top Performing Team</h3>
          {topTeam ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Team Header */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 600, color: '#002F6C', margin: '0 0 5px 0' }}>{topTeam.name}</p>
                <p style={{ fontSize: 14, color: '#a0aec0', margin: '0 0 10px 0' }}>{topTeam.department}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#00bfae', margin: '0' }}>{Math.round(topTeam.avgScore)}%</p>
              </div>

              {/* Top 3 Parameters */}
              {topTeamStrengths.length > 0 && (
                <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '15px' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#002F6C', margin: '0 0 10px 0' }}>Top 3 Parameters</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {topTeamStrengths.map((param, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                        <span style={{ fontSize: 12, color: '#002F6C', fontWeight: 500 }}>{param.parameter_name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#00bfae' }}>{Math.round(param.avg_score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#999' }}>No data available</p>
          )}
        </div>
      </div>

      {/* Row 4: Score Distribution and Completion Cards */}
      <div className="center-cards" style={{ marginTop: '20px' }}>
        {/* Card 1: Employee Score Distribution */}
        <div className="top-performer-card" style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 24, marginBottom: 20 }}>Employee Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={scoreDistribution}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => value} />
              <Bar dataKey="count" fill="#003f88" radius={[4, 4, 0, 0]}>
                {scoreDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isHighest ? '#00bfae' : '#003f88'} 
                  />
                ))}
                <LabelList dataKey="count" position="top" fill="#333" fontSize={12} fontWeight="bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Card 2: Evaluation Completion by Department */}
        <div className="top-performer-card" style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 24, marginBottom: 20 }}>Evaluation Completion by Department</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {deptCompletion.map((dept, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#002F6C' }}>{dept.department}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: dept.percentage < 60 ? '#ff6b6b' : '#00bfae' }}>
                      {dept.percentage}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${dept.percentage}%`,
                      height: '100%',
                      backgroundColor: dept.percentage < 60 ? '#ff6b6b' : '#00bfae',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#a0aec0', marginTop: '2px' }}>
                    {dept.completed} of {dept.total} completed
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Employees Needing Attention */}
      <div className="center-cards" style={{ marginTop: '20px' }}>
        <div className="top-performer-card" style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 24, marginBottom: 20, color: '#ff6b6b' }}>Employees Needing Attention</h3>
          
          {employeesNeedingAttention.length > 0 ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: 12, fontWeight: 600, color: '#002F6C' }}>Employee</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: 12, fontWeight: 600, color: '#002F6C' }}>Department</th>
                    <th style={{ textAlign: 'center', padding: '10px', fontSize: 12, fontWeight: 600, color: '#002F6C' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: 12, fontWeight: 600, color: '#002F6C' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesNeedingAttention.map((emp, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '10px', fontSize: 13, color: '#002F6C', fontWeight: 500 }}>{emp.name}</td>
                      <td style={{ padding: '10px', fontSize: 13, color: '#666' }}>{emp.department}</td>
                      <td style={{ padding: '10px', fontSize: 13, fontWeight: 600, color: emp.currentScore < 60 ? '#ff6b6b' : '#ff9800', textAlign: 'center' }}>{emp.currentScore}</td>
                      <td style={{ padding: '10px', fontSize: 13, color: '#666' }}>{emp.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'center' }}>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}>
                  View All
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#999' }}>
              <p style={{ fontSize: 14, margin: 0 }}>All employees performing within acceptable range.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
