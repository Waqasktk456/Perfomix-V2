// src/pages/CreateCycle.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddInputField from "../../components/AddInputField";
import axios from "axios";
import { toast } from "react-toastify";
import SuccessModal from "../../modals/SuccessModal";
import "./Createcycle.css";
import { Teamicon } from '../../assets';

const CreateCycle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isEditMode = location.state?.isEdit || false;
  const isViewMode = location.state?.isView || false;
  const cycleToEdit = location.state?.cycleToEdit;
  const isReadOnly = isViewMode && cycleToEdit?.status !== 'draft';

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [totalTeams, setTotalTeams] = useState(0);
  const [lineManagerMatrices, setLineManagerMatrices] = useState([]);
  const [selectedLMMatrix, setSelectedLMMatrix] = useState("");
  const [teams, setTeams] = useState([]);
  const [staffMatrices, setStaffMatrices] = useState([]);
  const [managers, setManagers] = useState([]);
  const [rows, setRows] = useState([{ id: Date.now(), team_id: '', matrix_id: '', manager_id: '', error: '' }]);
  const [allCycles, setAllCycles] = useState([]);
  const [importCycleId, setImportCycleId] = useState('');
  const [importedFrom, setImportedFrom] = useState('');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportId, setPendingImportId] = useState('');

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [teamsRes, matrixRes, empRes] = await Promise.all([
          fetch('http://localhost:5000/api/teams', { headers }),
          fetch('http://localhost:5000/api/matrices?status=active', { headers }),
          fetch('http://localhost:5000/api/employees', { headers }),
        ]);
        const teamsData = await teamsRes.json();
        const matrixData = await matrixRes.json();
        const empData = await empRes.json();
        const allTeams = Array.isArray(teamsData) ? teamsData : [];
        setTeams(allTeams);
        setTotalTeams(allTeams.length);
        const allMatrices = matrixData.data || [];
        setLineManagerMatrices(allMatrices.filter(m => m.matrix_type === 'line-manager'));
        setStaffMatrices(allMatrices.filter(m => m.matrix_type === 'staff'));
        const allEmps = Array.isArray(empData) ? empData : [];
        setManagers(allEmps.filter(e => e.role === 'line-manager'));
      } catch { setTotalTeams(0); }
    };
    fetchData();
  }, []);

  const selectedTeamIds = rows.map(r => r.team_id).filter(Boolean);

  const addRow = () => setRows(prev => [...prev, { id: Date.now(), team_id: '', matrix_id: '', manager_id: '', error: '' }]);

  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const updateRow = (id, field, value) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value, error: '' } : r));

  // Fetch all cycles for import dropdown
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/cycles', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setAllCycles(Array.isArray(data) ? data : []);
      } catch {}
    };
    fetchCycles();
  }, []);

  const handleImportSelect = (cycleId) => {
    if (!cycleId) return;
    setPendingImportId(cycleId);
    setShowImportConfirm(true);
  };

  const confirmImport = async () => {
    setShowImportConfirm(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/cycle-assignments/${pendingImportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const assignments = Array.isArray(data) ? data : [];
      if (assignments.length === 0) { toast.info('No assignments found in selected cycle'); return; }
      setRows(assignments.map(a => ({
        id: Date.now() + Math.random(),
        team_id: String(a.team_id || ''),
        matrix_id: String(a.matrix_id || ''),
        manager_id: String(a.line_manager_id || a.evaluator_id || ''),
        error: ''
      })));
      const cycle = allCycles.find(c => String(c.id) === String(pendingImportId));
      setImportedFrom(cycle?.name || 'Previous Cycle');
      setImportCycleId(pendingImportId);
      toast.success(`Imported ${assignments.length} assignment(s)`);
    } catch { toast.error('Failed to import assignments'); }
    setPendingImportId('');
  };
  useEffect(() => {
    const contentEl = document.querySelector('.content');
    if (contentEl) {
      contentEl.style.paddingLeft = '0';
      contentEl.style.paddingRight = '0';
      contentEl.style.paddingTop = '0';
      contentEl.style.paddingBottom = '0';
      contentEl.style.background = '#ffffff';
    }
    return () => {
      if (contentEl) {
        contentEl.style.paddingLeft = '';
        contentEl.style.paddingRight = '';
        contentEl.style.paddingTop = '';
        contentEl.style.paddingBottom = '';
        contentEl.style.background = '';
      }
    };
  }, []);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    if ((isEditMode || isViewMode) && cycleToEdit) {
      setName(cycleToEdit.name);
      setStartDate(cycleToEdit.start_date.split("T")[0]);
      setEndDate(cycleToEdit.end_date.split("T")[0]);
      setSavedCycleId(cycleToEdit.id);
      // Load existing assignments
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      fetch(`http://localhost:5000/api/cycle-assignments/${cycleToEdit.id}`, { headers })
        .then(r => r.json())
        .then(data => {
          const assignments = Array.isArray(data) ? data : [];
          if (assignments.length > 0) {
            setRows(assignments.map(a => ({
              id: Date.now() + Math.random(),
              team_id: String(a.team_id || ''),
              matrix_id: String(a.matrix_id || ''),
              manager_id: String(a.line_manager_id || a.evaluator_id || ''),
              error: ''
            })));
          }
        }).catch(() => {});
      // Load LM matrix
      fetch(`http://localhost:5000/api/cycles/${cycleToEdit.id}`, { headers })
        .then(r => r.json())
        .then(data => { if (data.line_manager_matrix_id) setSelectedLMMatrix(String(data.line_manager_matrix_id)); })
        .catch(() => {});
    }
  }, [isEditMode, isViewMode, cycleToEdit]);

  const handleActivate = async (cycleId) => {
    if (!window.confirm("Activate this cycle? Assignments will be locked.")) return;
    const loadingToast = toast.loading("Activating cycle...");
    try {
      const config = getAuthConfig();
      const response = await axios.post(`http://localhost:5000/api/cycles/${cycleId}/activate`, {}, { ...config, timeout: 60000 });
      toast.dismiss(loadingToast);
      toast.success(response.data.message || "Cycle activated successfully");
      navigate("/evaluation-cycle");
    } catch (err) {
      toast.dismiss(loadingToast);
      if (err.code === 'ECONNABORTED') {
        toast.error("Activation is taking too long. Please refresh and check if it completed.");
      } else {
        toast.error(err.response?.data?.error || err.message || "Activation failed");
      }
    }
  };
  const [savedCycleId, setSavedCycleId] = useState(isEditMode ? cycleToEdit?.id : null);

  const handleSave = async (silent = false) => {
    if (!name.trim()) return toast.error("Cycle name is required");
    if (!startDate || !endDate) return toast.error("Dates are required");
    if (new Date(endDate) <= new Date(startDate))
      return toast.error("End date must be after start date");

    try {
      setLoading(true);
      const config = getAuthConfig();

      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/cycles/${cycleToEdit.id}`, {
          name: name.trim(), start_date: startDate, end_date: endDate,
        }, config);
        if (selectedLMMatrix) {
          await axios.put(`http://localhost:5000/api/cycles/${cycleToEdit.id}/line-manager-matrix`,
            { line_manager_matrix_id: selectedLMMatrix }, config);
        }
        setSavedCycleId(cycleToEdit.id);
        if (!silent) { toast.success("Cycle updated (still draft)"); navigate("/evaluation-cycle"); }
        return cycleToEdit.id;
      } else {
        const res = await axios.post("http://localhost:5000/api/cycles", {
          name: name.trim(), start_date: startDate, end_date: endDate,
        }, config);
        const newCycleId = res.data?.cycle_id || res.data?.id || res.data?.cycle?.id;
        if (selectedLMMatrix && newCycleId) {
          await axios.put(`http://localhost:5000/api/cycles/${newCycleId}/line-manager-matrix`,
            { line_manager_matrix_id: selectedLMMatrix }, config);
        }
        const validRows = rows.filter(r => r.team_id && r.matrix_id && r.manager_id);
        for (const row of validRows) {
          await axios.post('http://localhost:5000/api/cycle-assignments', {
            cycle_id: newCycleId,
            team_id: row.team_id,
            matrix_id: row.matrix_id,
            line_manager_id: row.manager_id,
          }, config);
        }
        setSavedCycleId(newCycleId);
        if (!silent) { toast.success("Cycle saved as draft"); navigate("/evaluation-cycle"); }
        return newCycleId;
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-matrix-container">
      <SuccessModal
        open={showSuccess}
        onClose={() => { setShowSuccess(false); navigate("/evaluation-cycle"); }}
        title="Success!"
        description={isEditMode ? "Cycle updated" : "Cycle saved as draft"}
      />

      <div className="cycle-page-layout">
        {/* LEFT: Heading + Form */}
        <div className="cycle-form-col">
          <div className="page-heading-block">
            <h1 className="page-main-title">
              {isReadOnly ? `${cycleToEdit?.name} (${cycleToEdit?.status})` : isEditMode || isViewMode ? "Edit Evaluation Cycle" : "Create Evaluation Cycle"}
            </h1>
            {isReadOnly && <p style={{ fontSize: 13, color: '#ef4444', marginTop: 4 }}>This cycle is {cycleToEdit?.status} — fields are read-only.</p>}
          </div>

          <div className="matrix-form">
            <div className="top-fields-row">
              <div className="cycle-name-field">
                <AddInputField
                  label="Cycle Name"
                  placeholder="e.g., Q4 2025 Performance Review"
                  value={name}
                  onChange={(e) => !isReadOnly && setName(e.target.value)}
                />
              </div>
              <div className="date-field">
                <label className="input-label">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => !isReadOnly && setStartDate(e.target.value)} className="date-input" disabled={isReadOnly} />
              </div>
              <div className="date-field">
                <label className="input-label">End Date</label>
                <input type="date" value={endDate} onChange={(e) => !isReadOnly && setEndDate(e.target.value)} className="date-input" disabled={isReadOnly} />
              </div>
            </div>
          </div>

          {/* Line Manager Matrix Section */}
          <div style={{ marginTop: 12 }}>
            <label className="input-label">Line Manager Evaluation Matrix</label>
            <select
              className="lm-matrix-select"
              style={{ width: '100%' }}
              value={selectedLMMatrix}
              onChange={(e) => !isReadOnly && setSelectedLMMatrix(e.target.value)}
              disabled={isReadOnly}
            >
              <option value="">Select Line Manager Matrix</option>
              {lineManagerMatrices.map((m) => (
                <option key={m.matrix_id} value={m.matrix_id}>{m.matrix_name}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, marginBottom: 0 }} />
          </div>

          {/* Team Assignment Table - moved to full width below */}

        </div>

        {/* RIGHT: Cycle Summary Card */}
        <div className="cycle-summary-card">
          <h3 className="summary-title">Cycle Summary</h3>

          <div className="summary-section" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="summary-label" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>Total Teams Assigned</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                {rows.filter(r => r.team_id).length}
              </span>
            </div>
          </div>

          <div className="summary-section">
            <span className="summary-label">Cycle Duration</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                {startDate && endDate
                  ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : <span style={{ color: '#aaa', fontSize: 13 }}>Set dates to preview</span>}
              </span>
              {startDate && endDate && (
                <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                  {Math.max(0, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))}d
                </span>
              )}
            </div>
          </div>

          <div className="summary-section">
            <span className="summary-label">Status</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="summary-status-badge">{isEditMode ? (cycleToEdit?.status || 'Draft') : 'Draft'}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>Visibility: Internal</span>
            </div>
          </div>
        </div>
      </div>{/* end cycle-page-layout */}

      {/* FULL WIDTH: Team Assignment Table */}
      <div className="assign-section">
        <div className="assign-section-header">
          <h3 className="assign-title">Assign Teams to Evaluation Cycle</h3>
        </div>

        {/* Import row */}
        <div className="assign-toolbar">
          <div className="assign-import-wrap">
            {!isReadOnly && (
              <select className="assign-import-select" value={importCycleId} onChange={(e) => handleImportSelect(e.target.value)}>
                <option value="">Import from previous cycle</option>
                {allCycles.filter(c => String(c.id) !== String(savedCycleId)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {importedFrom && <span className="assign-imported-tag">✓ Imported from {importedFrom}</span>}
          </div>
          {!isReadOnly && <button className="add-row-btn" onClick={addRow}>+ Add Row</button>}
        </div>

        {/* Confirm modal */}
        {showImportConfirm && (
          <div className="import-confirm-overlay">
            <div className="import-confirm-box">
              <p>This will replace current assignments. Continue?</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="create-matrix-btn" style={{ padding: '8px 18px', fontSize: 13 }} onClick={() => { setShowImportConfirm(false); setPendingImportId(''); }}>Cancel</button>
                <button className="save-btn" style={{ padding: '8px 18px', fontSize: 13, background: '#0b3558' }} onClick={confirmImport}>Continue</button>
              </div>
            </div>
          </div>
        )}
        <div className="assign-table-wrap">
          <table className="assign-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Performance Matrix</th>
                <th>Line Manager</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.error ? 'row-error' : ''}>
                  <td>
                    <select className="assign-select" value={row.team_id} disabled={isReadOnly} onChange={(e) => updateRow(row.id, 'team_id', e.target.value)}>
                      <option value="">Select Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id} disabled={selectedTeamIds.includes(String(t.id)) && String(row.team_id) !== String(t.id)}>
                          {t.team_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select className="assign-select" value={row.matrix_id} disabled={isReadOnly} onChange={(e) => updateRow(row.id, 'matrix_id', e.target.value)}>
                      <option value="">Select Matrix</option>
                      {staffMatrices.map(m => <option key={m.matrix_id} value={m.matrix_id}>{m.matrix_name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="assign-select" value={row.manager_id} disabled={isReadOnly} onChange={(e) => updateRow(row.id, 'manager_id', e.target.value)}>
                      <option value="">Select Line Manager</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                    </select>
                  </td>
                  <td>
                    {!isReadOnly && (
                    <button className="delete-row-btn" onClick={() => removeRow(row.id)} title="Remove row">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buttons - full width */}
      <div className="action-buttons" style={{ padding: '12px 30px 20px', marginTop: 0 }}>
        {isEditMode && cycleToEdit?.status !== "draft" && (
          <div style={{ width: '100%', marginBottom: 16, padding: "15px", background: "#fee2e2", borderRadius: "8px", color: "#991b1b" }}>
            <strong>Note:</strong> This cycle is {cycleToEdit.status}. Only draft cycles can be edited.
          </div>
        )}
        <button className="save-btn" onClick={handleSave} disabled={loading || isReadOnly || (isEditMode && cycleToEdit?.status !== "draft")}>
          {loading ? "Saving..." : isEditMode ? "Update Draft" : "Save as Draft"}
        </button>
        <button
          className="create-matrix-btn"
          onClick={async () => {
            if (!name.trim()) return toast.error("Cycle name is required");
            if (!startDate || !endDate) return toast.error("Dates are required");
            if (new Date(endDate) <= new Date(startDate)) return toast.error("End date must be after start date");
            let cycleId = savedCycleId;
            if (!cycleId) {
              cycleId = await handleSave(true);
            }
            if (cycleId) handleActivate(cycleId);
          }}
          disabled={loading || isReadOnly}
        >
          Activate Cycle
        </button>
      </div>

    </div>
  );
};

export default CreateCycle;