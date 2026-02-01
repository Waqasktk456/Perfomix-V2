// src/pages/ViewMatrix.js
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./CreateMatrix.css";
import { DeleteIcon } from "../../assets";
import axios from "axios";
import { toast } from "react-toastify";

const ViewMatrix = () => {
  const location = useLocation();
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
      <div style={{ color: "#666", marginBottom: 16 }}>
        Performance Matrix › <strong>View Matrix</strong>
      </div>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#002f5f" }}>
          {matrix.matrix_name}
        </h1>
        <p style={{ fontSize: 20, color: "#002f5f" }}>ID: {matrix.matrix_id}</p>
      </div>

      <table className="matrix-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>PARAMETER NAME</th>
            <th>WEIGHTAGE</th>
            <th>DESCRIPTION</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param) => (
            <tr key={param.parameter_id}>
              <td><strong>{param.parameter_name}</strong></td>
              <td><strong>{param.weightage}%</strong></td>
              <td>{param.description || "-"}</td>
              
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ViewMatrix;