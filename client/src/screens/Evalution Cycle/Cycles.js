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

  const handleComplete = async (cycleId) => {
    if (!window.confirm("Mark this cycle as closed? This action cannot be undone.")) return;
    try {
      const config = getAuthConfig();
      await axios.post(`http://localhost:5000/api/cycles/${cycleId}/complete`, {}, config);
      toast.success("Cycle marked as closed");
      fetchCycles();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to close cycle");
    }
  };

  const handleDelete = async (cycleId, cycleStatus) => {
    if (cycleStatus === 'active') {
      toast.error("Cannot delete active cycle. Please complete it first.");
      return;
    }
    if (!window.confirm("Delete this cycle? All related data will be removed. This action cannot be undone.")) return;
    try {
      const config = getAuthConfig();
      await axios.delete(`http://localhost:5000/api/cycles/${cycleId}`, config);
      toast.success("Cycle deleted successfully");
      fetchCycles();
      if (selectedCycle?.id === cycleId) setSelectedCycle(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete cycle");
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
            <th>SR No</th>
            <th>Cycle Name</th>
            <th>Period</th>
            <th>Status</th>
            <th>Teams Assigned</th>
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cycles.length > 0 ? (
            cycles.map((cycle, index) => (
              <tr
                key={cycle.id}
                className={selectedCycle?.id === cycle.id ? "selected-row" : ""}
                onClick={() => handleRowClick(cycle)}
                style={{ cursor: "pointer" }}
              >
                <td>{index + 1}</td>
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
                  <button onClick={() => handleEdit(cycle)} className="icon-btn" title="Edit">
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#10B981" stroke="#059669" strokeWidth="2"/>
                          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <span className="divider">/</span>
                    </>
                  )}
                  {cycle.status === "active" && (
                    <>
                      <button
                        onClick={() => handleComplete(cycle.id)}
                        className="icon-btn complete-btn"
                        title="Mark as Closed"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="18" height="18" rx="3" fill="#3B82F6" stroke="#2563EB" strokeWidth="2"/>
                          <path d="M7 12L10.5 15.5L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <span className="divider">/</span>
                    </>
                  )}
                  <button 
                    onClick={() => handleDelete(cycle.id, cycle.status)} 
                    className="icon-btn delete-btn"
                    title="Delete Cycle"
                    disabled={cycle.status === 'active'}
                    style={{ opacity: cycle.status === 'active' ? 0.5 : 1 }}
                  >
                    <img src={DeleteIcon} alt="Delete" className="icon" />
                  </button>
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