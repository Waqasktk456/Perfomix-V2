// LineManager/screens/EvaluateEmployee.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./EvaluateEmployee.css";

const EvaluateEmployee = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const [employee, setEmployee] = useState({});
  const [matrix, setMatrix] = useState({});
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [evaluationStatus, setEvaluationStatus] = useState('');

  useEffect(() => {
    if (!state.evaluationId || !state.employeeId) {
      toast.error("Invalid access. Redirecting to dashboard...");
      navigate("/linemanager-dashboard");
      return;
    }

    setEmployee({
      id: state.employeeId,
      name: state.employeeName,
      email: state.employeeEmail,
      designation: state.designation,
      profileImage: state.profileImage,
    });

    setMatrix({
      name: state.matrixName,
      id: state.matrixId,
    });

    const fetchEvaluationData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token");

        const response = await axios.get(
          `http://localhost:5000/api/line-manager/evaluation-form/${state.evaluationId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        console.log("Form API response:", response.data);

        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to load form");
        }

        const params = response.data.parameters.map(p => ({
          parameter_id: p.parameter_id,
          parameter_name: p.parameter_name,
          weightage: p.weightage,
          score: (p.score && p.score > 0) ? p.score : "",
          comments: p.feedback || "",
          weighted_score: p.score ? ((p.weightage / 100) * p.score).toFixed(2) : "0.00"
        }));

        setParameters(params);
        setEvaluationStatus(response.data.evaluation_status);
        setIsEditable(response.data.is_editable);
        setLoading(false);
      } catch (err) {
        console.error("Form load error:", err);
        toast.error("Failed to load evaluation form: " + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };

    fetchEvaluationData();
  }, [location.state, navigate, state.evaluationId, state.employeeId]);

  const handleScoreChange = (index, value) => {
    if (!isEditable) return;
    
    if (value === "" || (/^\d*$/.test(value) && Number(value) <= 100)) {
      const updated = [...parameters];
      updated[index].score = value;
      updated[index].weighted_score = value 
        ? ((updated[index].weightage / 100) * Number(value)).toFixed(2)
        : "0.00";
      setParameters(updated);
    }
  };

  const handleCommentsChange = (index, value) => {
    if (!isEditable) return;
    
    const updated = [...parameters];
    updated[index].comments = value;
    setParameters(updated);
  };

  const getTotalWeightedScore = () => {
    return parameters
      .reduce((sum, p) => sum + (p.weighted_score ? Number(p.weighted_score) : 0), 0)
      .toFixed(2);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        'http://localhost:5000/api/line-manager/save-draft',
        {
          evaluation_id: state.evaluationId,
          parameters: parameters.map(p => ({
            parameter_id: p.parameter_id,
            score: p.score === "" ? null : Number(p.score),
            comments: p.comments || ""
          }))
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success("Draft saved successfully!");
      } else {
        throw new Error(response.data.message || "Save failed");
      }
    } catch (err) {
      console.error("Save draft error:", err);
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    // Validate all parameters have scores
    const emptyParams = parameters.filter(p => !p.score || p.score === "");
    
    if (emptyParams.length > 0) {
      toast.error(`Please fill all ${parameters.length} parameters before submitting. ${emptyParams.length} parameter(s) are still empty.`);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        'http://localhost:5000/api/line-manager/submit-evaluation',
        {
          evaluation_id: state.evaluationId,
          parameters: parameters.map(p => ({
            parameter_id: p.parameter_id,
            score: Number(p.score),
            comments: p.comments || ""
          }))
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success("Evaluation submitted successfully!");
        setTimeout(() => {
          navigate(-1); // Go back to team members list
        }, 1500);
      } else {
        throw new Error(response.data.message || "Submit failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Submit failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center", fontSize: "18px" }}>Loading evaluation form...</div>;
  }

  return (
    <div className="evaluation-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span onClick={() => navigate("/linemanager-dashboard")} style={{ cursor: "pointer" }}>Dashboard</span> ›
        <span onClick={() => navigate(-1)} style={{ cursor: "pointer" }}> {state.teamName}</span> ›
        <span className="active"> {isEditable ? 'Evaluate' : 'View'}: {employee.name}</span>
      </div>

      {/* Status Banner for Completed Evaluations */}
      {!isEditable && (
        <div style={{ 
          background: "#28a745", 
          color: "white", 
          padding: "12px 20px", 
          borderRadius: "8px", 
          marginBottom: "20px",
          textAlign: "center",
          fontWeight: "600"
        }}>
          ✓ This evaluation has been completed and submitted. View mode only.
        </div>
      )}

      {/* Header */}
      <div style={{ margin: "20px 0", padding: "20px", background: "#f8f9fa", borderRadius: "10px", display: "flex", alignItems: "center", gap: "20px" }}>
        {employee.profileImage ? (
          <img src={employee.profileImage} alt={employee.name} style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#007bff", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "32px", fontWeight: "bold" }}>
            {employee.name.charAt(0)}
          </div>
        )}
        <div>
          <h2>{employee.name}</h2>
          <p style={{ margin: "5px 0", color: "#555" }}>
            <strong>Designation:</strong> {employee.designation} | 
            <strong> Email:</strong> {employee.email}
          </p>
          <p><strong>Performance Matrix:</strong> {matrix.name}</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <h3>Total Weighted Score</h3>
          <h2 style={{ color: "#007bff", margin: "10px 0" }}>{getTotalWeightedScore()}/100</h2>
        </div>
      </div>

      {/* Parameters Table */}
      <h3 style={{ margin: "30px 0 20px" }}>Parameter Evaluation</h3>
      <table className="employee-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#007bff", color: "white" }}>
            <th style={{ padding: "15px", textAlign: "left" }}>Parameter</th>
            <th style={{ padding: "15px", textAlign: "center" }}>Weightage</th>
            <th style={{ padding: "15px", textAlign: "center" }}>Score (0-100)</th>
            <th style={{ padding: "15px", textAlign: "center" }}>Weighted Score</th>
            <th style={{ padding: "15px", textAlign: "left" }}>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param, index) => (
            <tr key={param.parameter_id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "15px" }}>{param.parameter_name}</td>
              <td style={{ padding: "15px", textAlign: "center" }}>{param.weightage}%</td>
              <td style={{ padding: "15px", textAlign: "center" }}>
                <input
                  type="text"
                  value={param.score}
                  onChange={(e) => handleScoreChange(index, e.target.value)}
                  placeholder="0-100"
                  disabled={!isEditable}
                  style={{ 
                    width: "80px", 
                    padding: "8px", 
                    textAlign: "center", 
                    borderRadius: "4px", 
                    border: "1px solid #ccc",
                    background: !isEditable ? "#f5f5f5" : "white",
                    cursor: !isEditable ? "not-allowed" : "text"
                  }}
                />
              </td>
              <td style={{ padding: "15px", textAlign: "center", fontWeight: "600" }}>
                {param.weighted_score}
              </td>
              <td style={{ padding: "15px" }}>
                <textarea
                  value={param.comments}
                  onChange={(e) => handleCommentsChange(index, e.target.value)}
                  placeholder="Enter feedback..."
                  disabled={!isEditable}
                  style={{ 
                    width: "100%", 
                    minHeight: "80px", 
                    padding: "10px", 
                    borderRadius: "4px", 
                    border: "1px solid #ccc",
                    background: !isEditable ? "#f5f5f5" : "white",
                    cursor: !isEditable ? "not-allowed" : "text",
                    resize: "vertical"
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bottom Action Buttons */}
      <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ 
            padding: "12px 24px", 
            background: "#6c757d", 
            color: "white",
            border: "none", 
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Back
        </button>
        
        {isEditable && (
          <div style={{ display: "flex", gap: "15px" }}>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              style={{ 
                padding: "12px 24px", 
                background: saving ? "#ccc" : "#ffc107", 
                color: "#000",
                border: "none", 
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "600"
              }}
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            
            <button
              onClick={handleSubmitEvaluation}
              disabled={submitting}
              style={{ 
                padding: "12px 24px", 
                background: submitting ? "#ccc" : "#28a745", 
                color: "white",
                border: "none", 
                borderRadius: "6px",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "600"
              }}
            >
              {submitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluateEmployee;