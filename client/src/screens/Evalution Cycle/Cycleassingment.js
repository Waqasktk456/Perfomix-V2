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
  const [lineManagerMatrices, setLineManagerMatrices] = useState([]);
  const [managers, setManagers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMatrix, setSelectedMatrix] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [selectedLMMatrix, setSelectedLMMatrix] = useState("");
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
      
      // Filter matrices by type
      const allMatrices = matrixRes.data.data || [];
      const staffMatrices = allMatrices.filter(m => m.matrix_type === 'staff');
      const lmMatrices = allMatrices.filter(m => m.matrix_type === 'line-manager');
      
      setMatrices(staffMatrices);
      setLineManagerMatrices(lmMatrices);
      setAssignments(assignRes.data || []);

      // Fetch line managers
      const empRes = await axios.get("http://localhost:5000/api/employees", config);
      const lineManagers = empRes.data.filter(e => e.role === "line-manager");
      setManagers(lineManagers);
      
      // Fetch cycle details to get the selected line manager matrix
      const cycleRes = await axios.get(`http://localhost:5000/api/cycles/${cycle.id}`, config);
      if (cycleRes.data.line_manager_matrix_id) {
        setSelectedLMMatrix(cycleRes.data.line_manager_matrix_id);
      }
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

  const handleSaveLMMatrix = async () => {
    if (!selectedLMMatrix) {
      return toast.error("Please select a line manager matrix");
    }

    try {
      setLoading(true);
      const config = getAuthConfig();
      
      console.log('Saving LM matrix:', { cycle_id: cycle.id, line_manager_matrix_id: selectedLMMatrix });
      
      const response = await axios.put(
        `http://localhost:5000/api/cycles/${cycle.id}/line-manager-matrix`,
        { line_manager_matrix_id: selectedLMMatrix },
        config
      );

      console.log('Save response:', response.data);
      toast.success("Line manager matrix saved successfully");
      fetchData();
    } catch (err) {
      console.error("Save LM matrix error:", err);
      console.error("Error response:", err.response?.data);
      toast.error(err.response?.data?.error || "Failed to save line manager matrix");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      setLoading(true);
      const config = getAuthConfig();
      await axios.delete(
        `http://localhost:5000/api/cycle-assignments/${assignmentId}`,
        config
      );

      toast.success("Assignment deleted successfully");
      fetchData();
    } catch (err) {
      console.error("Delete assignment error:", err);
      toast.error(err.response?.data?.error || "Failed to delete assignment");
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

      {(cycle?.status === "active" || cycle?.status === "closed") && (
        <div style={{ 
          padding: "15px", 
          background: cycle?.status === "closed" ? "#dbeafe" : "#fee2e2", 
          borderRadius: "8px", 
          color: cycle?.status === "closed" ? "#1e40af" : "#991b1b", 
          marginBottom: "20px" 
        }}>
          <strong>{cycle?.status === "closed" ? "Info:" : "Warning:"}</strong> This cycle is {cycle.status}. {cycle?.status === "closed" ? "Assignments are read-only." : "Assignments are locked."}
        </div>
      )}

      {/* Line Manager Matrix Selection */}
      <div style={{ 
        background: "#f8f9fa", 
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "30px",
        border: "1px solid #e2e8f0"
      }}>
        <h3 style={{ margin: "0 0 15px", fontWeight: "600", color: "#0b3558" }}>
          Line Manager Evaluation Matrix
        </h3>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
          Select the matrix that will be used to evaluate all line managers in this cycle
        </p>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <select
            value={selectedLMMatrix}
            onChange={(e) => setSelectedLMMatrix(e.target.value)}
            disabled={cycle?.status !== "draft"}
            className="select-input"
            style={{ flex: 1 }}
          >
            <option value="">Select Line Manager Matrix</option>
            {lineManagerMatrices.map((m) => (
              <option key={m.matrix_id} value={m.matrix_id}>
                {m.matrix_name}
              </option>
            ))}
          </select>
          <button
            className="add-parameter-btn"
            onClick={handleSaveLMMatrix}
            disabled={loading || cycle?.status !== "draft" || !selectedLMMatrix}
            style={{ minWidth: "150px" }}
          >
            {loading ? "Saving..." : "Save Matrix"}
          </button>
        </div>
      </div>

      <h3 style={{ margin: "0 0 15px", fontWeight: "600", color: "#0b3558" }}>
        Team Assignments
      </h3>

      <div className="assignment-form">
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          disabled={cycle?.status !== "draft"}
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
          disabled={cycle?.status !== "draft"}
          className="select-input"
        >
          <option value="">Select Staff Matrix</option>
          {matrices.map((m) => (
            <option key={m.matrix_id} value={m.matrix_id}>
              {m.matrix_name}
            </option>
          ))}
        </select>

        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          disabled={cycle?.status !== "draft"}
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
          disabled={loading || cycle?.status !== "draft"}
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
              <th style={{ width: "80px", textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.team_name}</td>
                <td>{a.matrix_name}</td>
                <td>{a.evaluator_name}</td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => handleDeleteAssignment(a.id)}
                    disabled={cycle?.status !== "draft" || loading}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: cycle?.status === "draft" ? "pointer" : "not-allowed",
                      padding: "5px",
                      opacity: cycle?.status === "draft" ? 1 : 0.5
                    }}
                    title="Delete assignment"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CycleAssignments;