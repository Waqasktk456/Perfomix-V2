import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { PieChart, Pie, Cell } from "recharts";
import TotalEmployees from '../../assets/images/total-employee.png';
import NewHires from '../../assets/images/new-hires.png';
import TotalDepartment from '../../assets/images/total-department.png';
import PendingEvaluation from '../../assets/images/pending-evaluation.png';
import profilepic from '../../assets/images/ali.png';
import '../../styles/typography.css';
import { TrophyImg } from "../../assets";
import SearchBar from "../../components/Searchbar/Searchbar";
import axios from "axios";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [newHires, setNewHires] = useState(0);
  const [totalDepartments, setTotalDepartments] = useState(0);
  const [pendingEvaluations, setPendingEvaluations] = useState(0);
  const [completedEvaluations, setCompletedEvaluations] = useState(0);
  const [topPerformers, setTopPerformers] = useState([]);
  const [needsImprovement, setNeedsImprovement] = useState([]);
  const [allEvaluations, setAllEvaluations] = useState([]);

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
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

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
    // Fetch evaluation statuses for pie chart
    axios.get("http://localhost:5000/api/evaluations/all-status", config).then(async res => {
      // Support both array response and { data: [] } response
      const all = Array.isArray(res.data) ? res.data : (res.data.data || []);

      const updatedAll = all.map(emp => ({
        ...emp,
        overall_score: Number(emp.overall_weighted_score) || 0,
        evaluation_status: emp.evaluation_status || 'Pending'
      }));

      setAllEvaluations(updatedAll);

      const completed = updatedAll.filter(e => e.evaluation_status === "Complete").length;
      const pending = updatedAll.filter(e => e.evaluation_status === "Pending").length;

      setCompletedEvaluations(completed);
      setPendingEvaluations(pending);

      // Remove duplicates
      const uniqueEvaluations = uniqueByEmployeeId(updatedAll);

      // Sort by overall_score descending and take top 2
      const sortedByScoreDesc = [...uniqueEvaluations].sort((a, b) => b.overall_score - a.overall_score);
      const topPerformersList = sortedByScoreDesc.slice(0, 2);
      setTopPerformers(topPerformersList);

      // Show ALL completed evaluations in the list (do not exclude top performers)
      const allCompletedList = [...uniqueEvaluations]
        .filter(emp => emp.evaluation_status === 'Complete')
        .sort((a, b) => b.overall_score - a.overall_score); // Sort highest score first

      setNeedsImprovement(allCompletedList);
    });
  }, []);

  const totalEvaluations = completedEvaluations + pendingEvaluations;
  const completedPercent = totalEvaluations ? Math.round((completedEvaluations / totalEvaluations) * 100) : 0;
  const pendingPercent = totalEvaluations ? Math.round((pendingEvaluations / totalEvaluations) * 100) : 0;

  const data = [
    { name: "Completed", value: completedPercent, color: "#002F6C" },
    { name: "Pending", value: pendingPercent, color: "#E87722" },
  ];

  return (
    <div>
      <h2 className="dashboard-title">Dashboard</h2>

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

      {/* Center Cards */}
      <div className="center-cards">
        {/* Top Performer */}
        <div className="top-performer-card">
          <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 32, marginBottom: 10 }}>Top Performer</h3>
          <div className="performers" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: 10 }}>
            {/* Left performer */}
            <div className="performer" style={{ flex: 1, textAlign: 'center' }}>
              {topPerformers[0] ? (
                <>
                  <p className="name" style={{ color: '#00bfae', fontWeight: 600, fontSize: 22, margin: 0, textAlign: 'center' }}>{topPerformers[0].First_name} {topPerformers[0].Last_name}</p>
                  <p className="role" style={{ color: '#a0aec0', fontWeight: 400, fontSize: 16, margin: 0, marginBottom: 10, textTransform: 'capitalize', textAlign: 'center' }}>{topPerformers[0].Designation}</p>
                  <img src={topPerformers[0].Profile_image || profilepic} alt={topPerformers[0].First_name} className="performer-pic" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                  <p className="score" style={{ color: '#00bfae', fontWeight: 400, fontSize: 16, margin: 0, textAlign: 'center' }}>{Number.isFinite(topPerformers[0]?.overall_score) ? Math.round(topPerformers[0].overall_score) : 0}</p>
                </>
              ) : (
                <div style={{ height: 120 }}></div>
              )}
            </div>

            {/* Trophy in the center */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <img src={TrophyImg} alt="Trophy" className="trophy-icon" style={{ width: 90, height: 90 }} />
            </div>

            {/* Right performer */}
            <div className="performer" style={{ flex: 1, textAlign: 'center' }}>
              {topPerformers[1] ? (
                <>
                  <p className="name" style={{ color: '#00bfae', fontWeight: 600, fontSize: 22, margin: 0, textAlign: 'center' }}>{topPerformers[1].First_name} {topPerformers[1].Last_name}</p>
                  <p className="role" style={{ color: '#a0aec0', fontWeight: 400, fontSize: 16, margin: 0, marginBottom: 10, textTransform: 'capitalize', textAlign: 'center' }}>{topPerformers[1].Designation}</p>
                  <img src={topPerformers[1].Profile_image || profilepic} alt={topPerformers[1].First_name} className="performer-pic" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                  <p className="score" style={{ color: '#00bfae', fontWeight: 400, fontSize: 16, margin: 0, textAlign: 'center' }}>{Number.isFinite(topPerformers[1]?.overall_score) ? Math.round(topPerformers[1].overall_score) : 0}</p>
                </>
              ) : (
                <div style={{ height: 120 }}></div>
              )}
            </div>
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

      <div className="employee-table">
        <h3 style={{ margin: '20px 0 10px 0', fontWeight: 600, fontSize: 24 }}>Employee Evaluations</h3>
        <table>
          <thead>
            <tr>
              <th>Employee Id</th>
              <th>Profile</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Evaluation Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {needsImprovement && needsImprovement.length > 0 && needsImprovement
              .map((emp, i) => (
                <tr key={i}>
                  <td>{emp.Employee_id}</td>
                  <td><img src={emp.Profile_image || profilepic} alt="profile" className="profile-pic" /></td>
                  <td>{emp.First_name} {emp.Last_name}</td>
                  <td>{emp.Department_name || emp.dept}</td>
                  <td>{emp.Designation || emp.role}</td>
                  <td style={{ color: emp.evaluation_status === 'Complete' ? '#008000' : undefined }}>
                    {emp.evaluation_status}
                  </td>
                  <td>{Number.isFinite(emp.overall_score) ? Math.round(emp.overall_score) : 0}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
