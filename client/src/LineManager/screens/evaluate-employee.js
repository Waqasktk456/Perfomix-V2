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
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResult, setAiResult] = useState({ feedback: '', recommendations: [] });
  const [globalFeedback, setGlobalFeedback] = useState('');
  const [globalRecommendation, setGlobalRecommendation] = useState('');

  useEffect(() => {
    if (!state.evaluationId || !state.employeeId) {
      toast.error("Invalid access. Redirecting to dashboard...");
      navigate("/linemanager-dashboard");
      return;
    }
    setEmployee({ id: state.employeeId, name: state.employeeName, email: state.employeeEmail, designation: state.designation, profileImage: state.profileImage });
    setMatrix({ name: state.matrixName, id: state.matrixId });

    const fetchEvaluationData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token");
        const response = await axios.get(`http://localhost:5000/api/line-manager/evaluation-form/${state.evaluationId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.data.success) throw new Error(response.data.message || "Failed to load form");

        const params = response.data.parameters.map((p) => ({
          parameter_id: p.parameter_id,
          parameter_name: p.parameter_name,
          weightage: p.weightage,
          rating: p.rating || "",
          score: p.score || "",
          weighted_score: p.score ? ((p.weightage / 100) * p.score).toFixed(2) : "0.00",
        }));

        setParameters(params);
        setIsEditable(response.data.is_editable);

        if (response.data.feedback) setGlobalFeedback(response.data.feedback);
        if (response.data.recommendation) setGlobalRecommendation(response.data.recommendation);

        try {
          const empRes = await axios.get(`http://localhost:5000/api/employees/${state.employeeId}`, { headers: { Authorization: `Bearer ${token}` } });
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

  const getScoreInfo = () => {
    const evaluated = parameters.filter((p) => p.rating !== "" && p.rating !== null);
    if (evaluated.length === 0) return { score: null, isComplete: false };
    const totalWeightEvaluated = evaluated.reduce((sum, p) => sum + Number(p.weightage), 0);
    const totalWeightedAchieved = evaluated.reduce((sum, p) => sum + Number(p.weighted_score || 0), 0);
    const normalizedScore = ((totalWeightedAchieved / totalWeightEvaluated) * 100).toFixed(2);
    const isComplete = evaluated.length === parameters.length;
    return { score: normalizedScore, isComplete };
  };

  const getTotalWeightedScore = () => { const { score } = getScoreInfo(); return score ?? "—"; };
  const allRated = parameters.length > 0 && parameters.every(p => p.rating !== "" && p.rating !== null);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:5000/api/line-manager/save-draft", {
        evaluation_id: state.evaluationId,
        parameters: parameters.map((p) => ({ parameter_id: p.parameter_id, rating: p.rating === "" ? null : Number(p.rating) })),
        feedback: globalFeedback,
        recommendation: globalRecommendation,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) toast.success("Draft saved successfully!");
      else throw new Error(response.data.message || "Save failed");
    } catch (err) { toast.error("Save failed: " + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  const handleSubmitEvaluation = async () => {
    const unrated = parameters.filter((p) => !p.rating);
    if (unrated.length > 0) { toast.error("Please rate all parameters before submitting."); return; }
    if (!globalFeedback.trim()) { toast.error("Please provide overall feedback before submitting."); return; }
    if (!globalRecommendation.trim()) { toast.error("Please provide overall recommendation before submitting."); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:5000/api/line-manager/submit-evaluation", {
        evaluation_id: state.evaluationId,
        parameters: parameters.map((p) => ({ parameter_id: p.parameter_id, rating: Number(p.rating) })),
        feedback: globalFeedback,
        recommendation: globalRecommendation,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) { toast.success("Evaluation submitted successfully!"); setTimeout(() => navigate(-1), 1500); }
      else throw new Error(response.data.message || "Submit failed");
    } catch (err) { toast.error("Submit failed: " + (err.response?.data?.message || err.message)); }
    finally { setSubmitting(false); }
  };

  const handleGenerateAI = async () => {
    if (!allRated) { toast.error("Please rate all parameters before generating AI feedback."); return; }
    setAiLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:5000/api/ai/generate-feedback", {
        role: employee.designation || "Employee",
        parameters: parameters.map(p => ({ 
          name: p.parameter_name, 
          rating: Number(p.rating),
          weight: Number(p.weightage) || 0
        }))
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        setAiResult({ feedback: response.data.feedback, recommendations: response.data.recommendations || [] });
        setShowAiModal(true);
      } else { toast.error("Unable to generate AI feedback. Please try again."); }
    } catch (err) { toast.error("Unable to generate AI feedback. Please try again."); }
    finally { setAiLoading(false); }
  };

  const applyAiFeedback = () => {
    setGlobalFeedback(aiResult.feedback);
    setGlobalRecommendation(aiResult.recommendations.join('\n'));
    setShowAiModal(false);
    toast.success("AI feedback applied. You can edit before saving.");
  };

  if (loading) return <div style={{ padding: "60px", textAlign: "center", fontSize: "18px" }}>Loading evaluation form...</div>;

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
          <button onClick={() => navigate(-1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>‹</button>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#111827" }}>Performance Evaluation</h1>
            <p style={{ margin: "4px 0 0", fontSize: "15px", color: "#6b7280" }}>Review and rate employee performance parameters</p>
          </div>
        </div>

        {/* Employee card */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", borderTop: "6px solid #003366", padding: "22px 28px", display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px", height: "207px" }}>
          <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "700", color: "#2563eb", flexShrink: 0, overflow: "hidden", marginTop: "18px" }}>
            {employee.profileImage ? <img src={employee.profileImage.startsWith("/uploads") ? `http://localhost:5000${employee.profileImage}` : employee.profileImage} alt={employee.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (employee.name ? employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?")}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 10px", fontFamily: "'Outfit', sans-serif", fontSize: "24px", lineHeight: "32px", fontWeight: "700", letterSpacing: "-0.6px", color: "#2B0F17" }}>{employee.name}</h2>
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
              {getScoreInfo().score === null ? "No ratings yet" : getScoreInfo().isComplete ? "✓ Final Score" : `Partial (${parameters.filter(p => p.rating !== "" && p.rating !== null).length}/${parameters.length} rated)`}
            </p>
          </div>
        </div>
      </div>

      {/* Parameters Table — no Feedback/Recommendation columns */}
      <div style={{ padding: "0 20px 20px" }}>
        <table className="employee-table eval-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <colgroup>
            <col style={{ width: "calc(40% + 100px)" }} />
            <col />
            <col style={{ width: "calc(28% - 100px)" }} />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Weightage</th>
              <th style={{ textAlign: "center" }}>Rating (1-5)</th>
              <th>Score</th>
              <th>Weighted Score</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => (
              <tr key={param.parameter_id} style={{ borderBottom: "1px solid #eee" }}>
                <td className="eval-param-name">{param.parameter_name}</td>
                <td style={{ padding: "15px", textAlign: "center" }}><span className="eval-weightage-badge">{param.weightage}%</span></td>
                <td className="eval-rating-col" style={{ padding: "15px", textAlign: "center", verticalAlign: "middle" }}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <RatingInput value={param.rating} onChange={(rating) => handleRatingChange(index, rating)} disabled={!isEditable} showLabel={false} />
                  </div>
                </td>
                <td className="eval-score-value" style={{ padding: "15px", textAlign: "center" }}>{param.score ? `${param.score}%` : "-"}</td>
                <td className="eval-weighted-score" style={{ padding: "15px", textAlign: "center" }}>{param.weighted_score}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="eval-total-row">
              <td colSpan={5} className="eval-total-label" style={{ textAlign: "center", height: "69px", padding: "0 15px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "120px" }}>
                  <span>{getScoreInfo().isComplete ? "Final Score" : "Current Score (Partial)"}</span>
                  <span className="eval-total-value">{getTotalWeightedScore()}</span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Global Feedback & Recommendation - Grid Layout */}
        <div className="feedback-recommendation-grid">
          <div className="feedback-rec-column">
            <div className="feedback-rec-header">Overall Feedback</div>
            <div className="feedback-rec-row" style={{ height: 'auto', minHeight: '120px', padding: '0' }}>
              <textarea 
                value={globalFeedback} 
                onChange={e => setGlobalFeedback(e.target.value)} 
                disabled={!isEditable} 
                rows={5} 
                placeholder="Enter overall feedback for this employee..." 
                style={{ 
                  width: "100%", 
                  height: "100%",
                  padding: "14px 10px", 
                  border: "none", 
                  fontSize: "13px", 
                  resize: "vertical", 
                  fontFamily: "inherit", 
                  boxSizing: "border-box", 
                  background: !isEditable ? "#f9fafb" : "#fff",
                  color: "#333",
                  lineHeight: "1.6",
                  outline: "none"
                }} 
              />
            </div>
          </div>
          <div className="feedback-rec-column">
            <div className="feedback-rec-header">Overall Recommendation</div>
            <div className="feedback-rec-row" style={{ height: 'auto', minHeight: '120px', padding: '0' }}>
              <textarea 
                value={globalRecommendation} 
                onChange={e => setGlobalRecommendation(e.target.value)} 
                disabled={!isEditable} 
                rows={5} 
                placeholder="Enter overall recommendations..." 
                style={{ 
                  width: "100%", 
                  height: "100%",
                  padding: "14px 10px", 
                  border: "none", 
                  fontSize: "13px", 
                  resize: "vertical", 
                  fontFamily: "inherit", 
                  boxSizing: "border-box", 
                  background: !isEditable ? "#f9fafb" : "#fff",
                  color: "#333",
                  lineHeight: "1.6",
                  outline: "none"
                }} 
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => navigate(-1)} className="eval-back-btn">Back to List</button>
          {isEditable && (
            <div style={{ display: "flex", gap: "15px" }}>
              <button onClick={handleGenerateAI} disabled={aiLoading} title="Generate AI Feedback"
                style={{ padding: '12px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', fontWeight: '600', fontSize: '14px', cursor: aiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(102,126,234,0.3)', opacity: aiLoading ? 0.7 : 1 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                {aiLoading ? 'Generating...' : 'Generate AI Feedback'}
              </button>
              <button onClick={handleSaveDraft} disabled={saving} className="eval-draft-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15.833 2.5H4.167A1.667 1.667 0 0 0 2.5 4.167v11.666A1.667 1.667 0 0 0 4.167 17.5h11.666A1.667 1.667 0 0 0 17.5 15.833V4.167L15.833 2.5z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.167 17.5v-6.667H5.833V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.833 2.5v4.167h6.667" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button onClick={handleSubmitEvaluation} disabled={submitting} className="eval-submit-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: "rotate(45deg)" }}><path d="M17.5 2.5L9.167 10.833" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.5 2.5L12.5 17.5L9.167 10.833L2.5 7.5L17.5 2.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {submitting ? "Submitting..." : "Submit Evaluation"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Feedback Modal */}
      {showAiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '600px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>AI Generated Feedback</h3>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Feedback</label>
              <textarea value={aiResult.feedback} onChange={e => setAiResult(prev => ({ ...prev, feedback: e.target.value }))} rows={5} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Recommendations</label>
              <textarea value={aiResult.recommendations.join('\n')} onChange={e => setAiResult(prev => ({ ...prev, recommendations: e.target.value.split('\n') }))} rows={6} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>Each line is a separate recommendation point</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={handleGenerateAI} disabled={aiLoading} style={{ padding: '10px 18px', borderRadius: '8px', border: '1.5px solid #667eea', background: '#fff', color: '#667eea', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>{aiLoading ? 'Regenerating...' : '↺ Regenerate'}</button>
              <button onClick={() => setShowAiModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={applyAiFeedback} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Apply to Form</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluateEmployee;
