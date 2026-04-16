import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { NoDepartmentImg } from "../../assets";
import "./Cycles.css";
import "../Teams/Teams.css";
import "../Employees/Employees.css";

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
    
    const loadingToast = toast.loading("Activating cycle...");
    
    try {
      const config = getAuthConfig();
      const response = await axios.post(
        `http://localhost:5000/api/cycles/${cycleId}/activate`, 
        {}, 
        { 
          ...config,
          timeout: 60000 // 60 second timeout
        }
      );
      
      toast.dismiss(loadingToast);
      toast.success(response.data.message || "Cycle activated successfully");
      fetchCycles();
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Activation error:', err);
      
      if (err.code === 'ECONNABORTED') {
        toast.error("Activation is taking too long. Please refresh and check if it completed.");
      } else {
        toast.error(err.response?.data?.error || err.message || "Activation failed");
      }
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
    navigate("/create-cycle", { state: { isView: true, cycleToEdit: selectedCycle, isEdit: selectedCycle.status === 'draft' } });
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
    <div className="container" style={{ paddingTop: '12px' }}>
      <div className="header-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0' }}>
        <h2 className="Matricestitle" style={{ margin: 0 }}>Evaluation Cycles</h2>
        <button className="create-matrix-btn" style={{ whiteSpace: 'nowrap' }} onClick={() => navigate("/create-cycle")}>
          Create New Cycle
        </button>
      </div>

      <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
        <table className="departments-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '28%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Cycle Name</th>
              <th style={{ textAlign: 'center' }}>Period</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Teams</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
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
                  <td><span className="emp-name-text">{cycle.name}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    {new Date(cycle.start_date).toLocaleDateString()} –{" "}
                    {new Date(cycle.end_date).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${cycle.status}`}>
                      {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{cycle.assigned_teams_count || 0}</td>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {/* 1. Edit */}
                    <button onClick={() => handleEdit(cycle)} className="organization-icon-button action-btn-edit" title="Edit">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>

                    {/* 2. Status — always 1 icon, changes by state */}
                    {(cycle.status === 'draft' || cycle.status === 'Draft') && (
                      <button onClick={() => handleActivate(cycle.id)} className="organization-icon-button" title="Activate Cycle" style={{ padding: '5px' }}>
                        {/* Zap/lightning — green: ready to launch */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#10b981" stroke="#10b981"/>
                        </svg>
                      </button>
                    )}
                    {(cycle.status === 'active' || cycle.status === 'Active') && (
                      <button onClick={() => handleComplete(cycle.id)} className="organization-icon-button" title="Active Cycle" style={{ padding: '5px' }}>
                        {/* Lock — purple */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </button>
                    )}
                    {(cycle.status !== 'draft' && cycle.status !== 'Draft' && cycle.status !== 'active' && cycle.status !== 'Active') && (
                      <button className="organization-icon-button" disabled title="Cycle Closed" style={{ padding: '5px', opacity: 0.4, cursor: 'not-allowed' }}>
                        {/* Archive box — grey: closed/done */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="21 8 21 21 3 21 3 8"/>
                          <rect x="1" y="3" width="22" height="5"/>
                          <line x1="10" y1="12" x2="14" y2="12"/>
                        </svg>
                      </button>
                    )}

                    {/* 3. View Assignments */}
                    <button
                      onClick={() => navigate("/create-cycle", { state: { isView: true, cycleToEdit: cycle, isEdit: cycle.status === 'draft' } })}
                      className="organization-icon-button action-btn-view"
                      title="View Assignments"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>

                    {/* 4. Delete */}
                    <button
                      onClick={() => handleDelete(cycle.id, cycle.status)}
                      className="organization-icon-button action-btn-delete"
                      title="Delete Cycle"
                      disabled={cycle.status === 'active' || cycle.status === 'Active'}
                      style={{ opacity: (cycle.status === 'active' || cycle.status === 'Active') ? 0.4 : 1 }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: 0, border: 'none' }}>
                  <div className="empty-state">
                    <img src={NoDepartmentImg} alt="No Cycles" className="no-department-img" />
                    <p className="empty-message-dept">No evaluation cycles found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvaluationCycles;