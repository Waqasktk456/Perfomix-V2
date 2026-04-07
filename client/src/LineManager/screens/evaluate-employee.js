// LineManager/screens/EvaluateEmployee.js
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import RatingInput from "../../components/RatingInput";
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
  const [department, setDepartment] = useState("");

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
    setMatrix({ name: state.matrixName, id: state.matrixId });

    const fetchEvaluationData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token");
        const response = await axios.get(
          `http://localhost:5000/api/line-manager/evaluation-form/${state.evaluationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.data.success) throw new Error(response.data.message || "Failed to load form");

        const params = response.data.parameters.map((p) => ({
          parameter_id: p.parameter_id,
          parameter_name: p.parameter_name,
          weightage: p.weightage,
          rating: p.rating || "",
          score: p.score || "",
          comments: p.feedback || "",
          recommendation: p.recommendation || "",
          weighted_score: p.score ? ((p.weightage / 100) * p.score).toFixed(2) : "0.00",
        }));

        setParameters(params);
        setIsEditable(response.data.is_editable);

        try {
          const empRes = await axios.get(
            `http://localhost:5000/api/employees/${state.employeeId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const empData = empRes.data?.data || empRes.data;
          setDepartment(empData?.Department_name || empData?.department_name || "");
        } catch (_) {}

        setLoading(false);
      } catch (err) {
        toast.error("Failed to load evaluation form: " + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };
    fetchEvaluationData();
  }, [location.state, navigate, state.evaluationId, state.employeeId]);

  const handleRatingChange = (index, ratingValue) => {
    if (!isEditable) return;
    const updated = [...parameters];
    updated[index].rating = ratingValue;
    const calculatedScore = (ratingValue / 5) * 100;
    updated[index].score = calculatedScore;
    updated[index].weighted_score = ((updated[index].weightage / 100) * calculatedScore).toFixed(2);
    setParameters(updated);
  };

  const handleCommentChange = (index, value) => {
    if (!isEditable) return;
    const updated = [...parameters];
    updated[index].comments = value;
    setParameters(updated);
  };

  const handleRecommendationChange = (index, value) => {
    if (!isEditable) return;
    const updated = [...parameters];
    updated[index].recommendation = value;
    setParameters(updated);
  };

  const getScoreInfo = () => {
    const evaluated = parameters.filter((p) => p.rating !== "" && p.rating !== null);
    if (evaluated.length === 0) return { score: null, isComplete: false };

    const totalWeightEvaluated = evaluated.reduce((sum, p) => sum + Number(p.weightage), 0);
    const totalWeightedAchieved = evaluated.reduce((sum, p) => sum + Number(p.weighted_score || 0), 0);
    const normalizedScore = ((totalWeightedAchieved / totalWeightEvaluated) * 100).toFixed(2);
    const isComplete = evaluated.length === parameters.length;

    return { score: normalizedScore, isComplete };
  };

  const getTotalWeightedScore = () => {
    const { score } = getScoreInfo();
    return score ?? "—";
  };

  const handleSaveDraft = async () => {
    // Draft validation: rating <=2 requires both feedback and recommendation
    const draftErrors = [];
    parameters.forEach((p, i) => {
      const r = Number(p.rating);
      if (r <= 2 && r > 0) {
        if (!p.comments.trim()) draftErrors.push(`Parameter "${p.parameter_name}": Feedback required for rating ≤2`);
        if (!p.recommendation.trim()) draftErrors.push(`Parameter "${p.parameter_name}": Recommendation required for rating ≤2`);
      }
    });
    if (draftErrors.length > 0) {
      draftErrors.forEach(e => toast.error(e));
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/line-manager/save-draft",
        {
          evaluation_id: state.evaluationId,
          parameters: parameters.map((p) => ({
            parameter_id: p.parameter_id,
            rating: p.rating === "" ? null : Number(p.rating),
            comments: p.comments,
            recommendation: p.recommendation,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) toast.success("Draft saved successfully!");
      else throw new Error(response.data.message || "Save failed");
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    const unrated = parameters.filter((p) => !p.rating);
    if (unrated.length > 0) {
      toast.error("Please rate all parameters before submitting.");
      return;
    }
    // Submit validation
    const submitErrors = [];
    parameters.forEach((p) => {
      const r = Number(p.rating);
      if (r <= 2) {
        if (!p.comments.trim()) submitErrors.push(`"${p.parameter_name}": Feedback required (rating ≤2)`);
        if (!p.recommendation.trim()) submitErrors.push(`"${p.parameter_name}": Recommendation required (rating ≤2)`);
      } else if (r >= 4) {
        if (!p.comments.trim()) submitErrors.push(`"${p.parameter_name}": Feedback required (rating ≥4)`);
      }
    });
    if (submitErrors.length > 0) {
      submitErrors.forEach(e => toast.error(e));
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/line-manager/submit-evaluation",
        {
          evaluation_id: state.evaluationId,
          parameters: parameters.map((p) => ({
            parameter_id: p.parameter_id,
            rating: Number(p.rating),
            comments: p.comments,
            recommendation: p.recommendation,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success("Evaluation submitted successfully!");
        setTimeout(() => navigate(-1), 1500);
      } else throw new Error(response.data.message || "Submit failed");
    } catch (err) {
      toast.error("Submit failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center", fontSize: "18px" }}>Loading evaluation form...</div>;
  }

  return (
    <div className="evaluation-container" style={{ margin: "-20px", padding: "0" }}>
      {!isEditable && (
        <div style={{ background: "#28a745", color: "white", padding: "12px 20px", textAlign: "center", fontWeight: "600" }}>
          ✓ This evaluation has been completed and submitted. View mode only.
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "24px 28px 0", background: "#f8f9fa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <button onClick={() => navigate(-1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ‹
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#111827" }}>Performance Evaluation</h1>
            <p style={{ margin: "4px 0 0", fontSize: "15px", color: "#6b7280" }}>Review and rate employee performance parameters</p>
          </div>
        </div>

        {/* Employee card */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", borderTop: "6px solid #003366", padding: "22px 28px", display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px", height: "207px" }}>
          <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "700", color: "#2563eb", flexShrink: 0, overflow: "hidden", marginTop: "18px" }}>
            {employee.profileImage
              ? <img src={employee.profileImage.startsWith("/uploads") ? `http://localhost:5000${employee.profileImage}` : employee.profileImage} alt={employee.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (employee.name ? employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?")}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 10px", fontFamily: "'Outfit', sans-serif", fontSize: "24px", lineHeight: "32px", fontWeight: "700", letterSpacing: "-0.6px", color: "#2B0F17" }}>
              {employee.name}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr", gap: "6px 4px" }}>
              <span><span style={{ marginRight: "6px" }}>👤</span><strong className="emp-info-label">Designation: </strong><span className="emp-info-value">{employee.designation}</span></span>
              <span><span style={{ marginRight: "6px" }}>✉️</span><strong className="emp-info-label">Email: </strong><span className="emp-info-value">{employee.email}</span></span>
              <span><span style={{ marginRight: "6px" }}>🏢</span><strong className="emp-info-label">Department: </strong><span className="emp-info-value">{department || "—"}</span></span>
              <span><span style={{ marginRight: "6px" }}>📋</span><strong className="emp-info-label">Matrix: </strong><span className="emp-matrix-badge">{matrix.name}</span></span>
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0, minWidth: "160px", background: "#F1F5F9", borderRadius: "10px", padding: "14px 18px", alignSelf: "center", marginLeft: "-60px", marginTop: "18px" }}>
            <p className="emp-info-label" style={{ margin: "0 0 4px" }}>Current Score</p>
            <p className="emp-info-value" style={{ margin: "0 0 4px", fontSize: "28px", fontWeight: "700", lineHeight: 1 }}>
              {getScoreInfo().score ?? "—"}{getScoreInfo().score && <span style={{ fontSize: "14px", fontWeight: "400" }}> / 100</span>}
            </p>
            <div style={{ width: "100%", height: "5px", background: "#e5e7eb", borderRadius: "3px", marginBottom: "5px" }}>
              <div style={{ width: `${Math.min(getScoreInfo().score || 0, 100)}%`, height: "100%", background: "#003366", borderRadius: "3px" }} />
            </div>
            <p className="emp-info-value" style={{ margin: 0, fontSize: "12px" }}>
              {getScoreInfo().score === null
                ? "No ratings yet"
                : getScoreInfo().isComplete
                ? "✓ Final Score"
                : `Partial (${parameters.filter(p => p.rating !== "" && p.rating !== null).length}/${parameters.length} rated)`}
            </p>
          </div>
        </div>
      </div>

      {/* Parameters Table */}
      <div style={{ padding: "0 20px 20px" }}>
        <table className="employee-table eval-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Weightage</th>
              <th>Rating (1-5)</th>
              <th>Score</th>
              <th>Weighted Score</th>
              <th>Feedback</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => (
              <tr key={param.parameter_id} style={{ borderBottom: "1px solid #eee" }}>
                <td className="eval-param-name">{param.parameter_name}</td>
                <td style={{ padding: "15px", textAlign: "center" }}>
                  <span className="eval-weightage-badge">{param.weightage}%</span>
                </td>
                <td style={{ padding: "15px", textAlign: "center" }}>
                  <RatingInput value={param.rating} onChange={(rating) => handleRatingChange(index, rating)} disabled={!isEditable} showLabel={false} />
                </td>
                <td className="eval-score-value" style={{ padding: "15px", textAlign: "center" }}>
                  {param.score ? `${param.score}%` : "-"}
                </td>
                <td className="eval-weighted-score" style={{ padding: "15px", textAlign: "center" }}>
                  {param.weighted_score}
                </td>
                <td style={{ padding: "12px 15px", verticalAlign: "middle" }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    {param.rating && (Number(param.rating) <= 2 || Number(param.rating) >= 4) && (
                      <span style={{ position: "absolute", top: "-8px", left: "10px", background: "white", padding: "0 3px", fontSize: "11px", color: "#ef4444", fontWeight: "700", lineHeight: 1, zIndex: 1 }}>*</span>
                    )}
                    <div className="eval-feedback-wrapper">
                      <svg className="eval-feedback-icon" viewBox="0 0 16 16" fill="none">
                        <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h2v3l3-3h7c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z"
                          stroke="#9ca3af" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      <input
                        className="eval-feedback-input"
                        type="text"
                        value={param.comments}
                        onChange={(e) => handleCommentChange(index, e.target.value)}
                        placeholder="Add feedback..."
                        disabled={!isEditable}
                        style={{ borderColor: (!param.comments.trim() && param.rating && (Number(param.rating) <= 2 || Number(param.rating) >= 4)) ? "#ef4444" : undefined }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 15px", verticalAlign: "middle" }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    {param.rating && Number(param.rating) <= 2 && (
                      <span style={{ position: "absolute", top: "-8px", left: "10px", background: "white", padding: "0 3px", fontSize: "11px", color: "#ef4444", fontWeight: "700", lineHeight: 1, zIndex: 1 }}>*</span>
                    )}
                    <div className="eval-feedback-wrapper">
                      <svg className="eval-feedback-icon" viewBox="0 0 16 16" fill="none">
                        <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h2v3l3-3h7c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z"
                          stroke="#9ca3af" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      <input
                        className="eval-feedback-input"
                        type="text"
                        value={param.recommendation}
                        onChange={(e) => handleRecommendationChange(index, e.target.value)}
                        placeholder="Add recommendation..."
                        disabled={!isEditable}
                        style={{ borderColor: (!param.recommendation.trim() && param.rating && Number(param.rating) <= 2) ? "#ef4444" : undefined }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="eval-total-row">
              <td colSpan={7} className="eval-total-label" style={{ textAlign: "center", height: "69px", padding: "0 15px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "120px" }}>
                  <span>{getScoreInfo().isComplete ? "Final Score" : "Current Score (Partial)"}</span>
                  <span className="eval-total-value">{getTotalWeightedScore()}</span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => navigate(-1)} className="eval-back-btn">Back to List</button>
          {isEditable && (
            <div style={{ display: "flex", gap: "15px" }}>
              <button onClick={handleSaveDraft} disabled={saving} className="eval-draft-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15.833 2.5H4.167A1.667 1.667 0 0 0 2.5 4.167v11.666A1.667 1.667 0 0 0 4.167 17.5h11.666A1.667 1.667 0 0 0 17.5 15.833V4.167L15.833 2.5z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.167 17.5v-6.667H5.833V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.833 2.5v4.167h6.667" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button onClick={handleSubmitEvaluation} disabled={submitting} className="eval-submit-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: "rotate(45deg)" }}>
                  <path d="M17.5 2.5L9.167 10.833" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17.5 2.5L12.5 17.5L9.167 10.833L2.5 7.5L17.5 2.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {submitting ? "Submitting..." : "Submit Evaluation"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluateEmployee;
