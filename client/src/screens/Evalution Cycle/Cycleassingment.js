// src/pages/CycleAssignments.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import AddInputField from "../../components/AddInputField";
import { FaPlus } from "react-icons/fa";
import "./Cycleassingment.css";

const CycleAssignments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cycle = location.state?.cycle;

  const [teams, setTeams] = useState([]);
  const [matrices, setMatrices] = useState([]);
  const [managers, setManagers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMatrix, setSelectedMatrix] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [loading, setLoading] = useState(false);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    if (!cycle) {
      toast.error("No cycle selected");
      navigate("/evaluation-cycles");
      return;
    }
    fetchData();
  }, [cycle]);

  const fetchData = async () => {
    try {
      const config = getAuthConfig();
      const [teamRes, matrixRes, assignRes] = await Promise.all([
        axios.get("http://localhost:5000/api/teams", config),
        axios.get("http://localhost:5000/api/matrices?status=active", config),
        axios.get(`http://localhost:5000/api/cycle-assignments/${cycle.id}`, config),
      ]);

      setTeams(teamRes.data);
      setMatrices(matrixRes.data.data || []);
      setAssignments(assignRes.data || []);

      // Fetch line managers (assuming you have an endpoint or filter from employees)
      const empRes = await axios.get("http://localhost:5000/api/employees", config);
      const lineManagers = empRes.data.filter(e => e.role === "line-manager");
      setManagers(lineManagers);
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

  const handleAssign = async () => {
    console.log("Attempting assignment:", { selectedTeam, selectedMatrix, selectedManager, cycle });

    if (!selectedTeam || !selectedMatrix || !selectedManager) {
      return toast.error("All fields are required");
    }

    if (!cycle || !cycle.id) {
      return toast.error("Cycle context missing");
    }

    try {
      setLoading(true);
      const config = getAuthConfig();
      await axios.post(
        "http://localhost:5000/api/cycle-assignments",
        {
          cycle_id: cycle.id,
          team_id: selectedTeam,
          matrix_id: selectedMatrix,
          line_manager_id: selectedManager,
        },
        config
      );

      toast.success("Team assigned successfully");

      // WORKFLOW UPDATE: Only clear the team, keep Matrix & Manager selected
      setSelectedTeam("");
      // setSelectedMatrix(""); // Kept for bulk assignment
      // setSelectedManager(""); // Kept for bulk assignment

      fetchData(); // refresh assignments list
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error(err.response?.data?.error || "Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  const availableTeams = teams.filter(
    (t) => !assignments.some((a) => a.team_id === t.id)
  );

  return (
    <div className="create-matrix-container">
      <div className="breadcrumb">
        <span>Evaluation Cycles</span> &gt;{" "}
        <span onClick={() => navigate("/evaluation-cycles")} style={{ cursor: "pointer", color: "#3b82f6" }}>
          Cycles
        </span>{" "}
        &gt; <span className="active">Assignments</span>
      </div>

      <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#0b3558", margin: "20px 0" }}>
        Assign Teams to: <strong>{cycle?.name}</strong>
      </h2>

      {cycle?.status !== "draft" && (
        <div style={{ padding: "15px", background: "#fee2e2", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>
          <strong>Warning:</strong> This cycle is {cycle.status}. Assignments are locked.
        </div>
      )}

      <div className="assignment-form">
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          // disabled={cycle?.status !== "draft"}
          className="select-input"
        >
          <option value="">Select Team</option>
          {availableTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.team_name}
            </option>
          ))}
        </select>

        <select
          value={selectedMatrix}
          onChange={(e) => setSelectedMatrix(e.target.value)}
          // disabled={cycle?.status !== "draft"}
          className="select-input"
        >
          <option value="">Select Active Matrix</option>
          {matrices.map((m) => (
            <option key={m.matrix_id} value={m.matrix_id}>
              {m.matrix_name}
            </option>
          ))}
        </select>

        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          // disabled={cycle?.status !== "draft"}
          className="select-input"
        >
          <option value="">Select Line Manager</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </option>
          ))}
        </select>

        <button
          className="add-parameter-btn"
          onClick={handleAssign}
          disabled={loading}
        >
          <FaPlus style={{ marginRight: "8px" }} />
          {loading ? "Assigning..." : "Assign Team"}
        </button>
      </div>

      <h3 style={{ margin: "30px 0 15px", fontWeight: "600" }}>
        Current Assignments ({assignments.length})
      </h3>

      {assignments.length === 0 ? (
        <div className="empty-state">No teams assigned yet</div>
      ) : (
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Matrix</th>
              <th>Evaluator</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.team_name}</td>
                <td>{a.matrix_name}</td>
                <td>{a.evaluator_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CycleAssignments;