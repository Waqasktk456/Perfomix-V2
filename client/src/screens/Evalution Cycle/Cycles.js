// src/pages/EvaluationCycles.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { EditIcon, DeleteIcon, ViewIcon } from "../../assets"; // adjust paths
import "./Cycles.css";

const EvaluationCycles = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const config = getAuthConfig();
      const res = await axios.get("http://localhost:5000/api/cycles", config);
      setCycles(res.data || []);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to load cycles");
      setLoading(false);
    }
  };

  const handleActivate = async (cycleId) => {
    if (!window.confirm("Activate this cycle? Assignments will be locked.")) return;
    try {
      const config = getAuthConfig();
      await axios.post(`http://localhost:5000/api/cycles/${cycleId}/activate`, {}, config);
      toast.success("Cycle activated successfully");
      fetchCycles();
    } catch (err) {
      toast.error(err.response?.data?.error || "Activation failed");
    }
  };

  const handleRowClick = (cycle) => {
    setSelectedCycle(cycle);
  };

  const handleViewAssignments = () => {
    if (!selectedCycle) return toast.error("Please select a cycle");
    navigate("/cycle-assingment", { state: { cycle: selectedCycle } });
  };

  const handleEdit = (cycle) => {
    if (cycle.status !== "draft") {
      toast.error("Only draft cycles can be edited");
      return;
    }
    navigate("/create-cycle", { state: { isEdit: true, cycleToEdit: cycle } });
  };

  if (loading) return <div className="loading">Loading cycles...</div>;

  return (
    <div className="container">
      {/* <div className="breadcrumb">
        <span>Home</span> &gt; <span className="active">Evaluation Cycles</span>
      </div> */}

      <div className="header-section">
        <h2 className="Matricestitle">Evaluation Cycles</h2>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Cycle Name</th>
            <th>Period</th>
            <th>Status</th>
            <th>Teams Assigned</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cycles.length > 0 ? (
            cycles.map((cycle) => (
              <tr
                key={cycle.id}
                className={selectedCycle?.id === cycle.id ? "selected-row" : ""}
                onClick={() => handleRowClick(cycle)}
                style={{ cursor: "pointer" }}
              >
                <td>{cycle.id}</td>
                <td>{cycle.name}</td>
                <td>
                  {new Date(cycle.start_date).toLocaleDateString()} -{" "}
                  {new Date(cycle.end_date).toLocaleDateString()}
                </td>
                <td>
                  <span className={`status-badge ${cycle.status}`}>
                    {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                  </span>
                </td>
                <td>{cycle.assigned_teams_count || 0}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(cycle)} className="icon-btn">
                    <img src={EditIcon} alt="Edit" className="icon" />
                  </button>
                  <span className="divider">/</span>
                  {cycle.status === "draft" && (
                    <>
                      <button
                        onClick={() => handleActivate(cycle.id)}
                        className="icon-btn activate-btn"
                        title="Activate Cycle"
                      >
                        ✅
                      </button>
                      <span className="divider">/</span>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-data">No evaluation cycles found</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="action-buttons">
        <button className="view-matrix-btn" onClick={handleViewAssignments}>
          View Assignments
        </button>
        <button
          className="create-matrix-btn"
          onClick={() => navigate("/create-cycle")}
        >
          Create New Cycle
        </button>
      </div>
    </div>
  );
};

export default EvaluationCycles;