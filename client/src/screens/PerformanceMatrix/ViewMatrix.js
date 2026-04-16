import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CreateMatrix.css";
import "../Departments/Department.css";
import "../Teams/Teams.css";
import "../Employees/Employees.css";
import { DeleteIcon } from "../../assets";
import axios from "axios";
import { toast } from "react-toastify";

const ViewMatrix = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const matrix = location.state?.matrix;

  const [parameters, setParameters] = useState(matrix?.parameters || []);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (parameter_id) => {
    if (!window.confirm("Remove this parameter from matrix?")) return;

    try {
      const updated = parameters.filter(p => p.parameter_id !== parameter_id);
      const rescaled = rescaleTo100(updated);
      setParameters(rescaled);

      toast.success("Parameter removed and weights rebalanced");
      // Optional: sync with backend later if needed
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const rescaleTo100 = (params) => {
    if (params.length === 0) return [];
    const total = params.reduce((s, p) => s + p.weightage, 0);
    if (total === 0) return params.map(p => ({ ...p, weightage: 0 }));

    const proportions = params.map(p => (p.weightage / total) * 100);
    const floors = proportions.map(Math.floor);
    const remainders = proportions.map((p, i) => ({ rem: p - floors[i], idx: i }));
    remainders.sort((a, b) => b.rem - a.rem);

    let remaining = 100 - floors.reduce((a, b) => a + b, 0);
    for (let i = 0; i < remaining; i++) {
      if (remainders[i]) floors[remainders[i].idx]++;
    }

    return params.map((p, i) => ({ ...p, weightage: floors[i] }));
  };

  if (!matrix) {
    return <div style={{ padding: 40, textAlign: "center" }}>No matrix selected</div>;
  }

  return (
    <div style={{ padding: "32px 0", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ color: "#666", marginBottom: 12, fontSize: 14 }}>
        Performance Matrix › <strong>View Matrix</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#002f5f", margin: 0 }}>
            {matrix.matrix_name}
          </h1>
        </div>
      </div>

      <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
        <table className="departments-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '35%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Parameter Name</th>
              <th style={{ textAlign: 'center' }}>Weightage</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => (
              <tr key={param.parameter_id}>
                <td><span className="emp-name-text">{param.parameter_name}</span></td>
                <td style={{ textAlign: 'center' }}><strong>{param.weightage}%</strong></td>
                <td>{param.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewMatrix;