import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RatingInput from '../../components/RatingInput';
import '../../LineManager/screens/EvaluateEmployee.css';

const EvaluateLineManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  
  const [lineManager, setLineManager] = useState(null);
  const [matrixParameters, setMatrixParameters] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [error, setError] = useState(null);
  const [matrixId, setMatrixId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResult, setAiResult] = useState({ feedback: '', recommendations: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Session expired');
          navigate('/login');
          return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };

        // Validate we have required data
        if (!state.cycleId) {
          toast.error('Invalid evaluation cycle. Please go back and select a cycle.');
          navigate('/linemanager-evaluation');
          return;
        }

        // Set line manager info from state
        setLineManager({
          id: state.lineManagerId || id,
          name: state.lineManagerName || 'Unknown',
          email: state.lineManagerEmail || '',
          department: state.department || 'N/A',
          designation: state.designation || 'N/A',
          cycleName: state.cycleName || 'N/A'
        });

        // Fetch cycle details to get the line_manager_matrix_id
        const cycleResponse = await axios.get(
          `http://localhost:5000/api/cycles/${state.cycleId}`,
          config
        );

        console.log('Cycle response:', cycleResponse.data);

        if (!cycleResponse.data.line_manager_matrix_id) {
          toast.error('No line manager matrix assigned to this evaluation cycle');
          navigate('/linemanager-evaluation', { state: { returnToCycleId: state.cycleId } });
          return;
        }

        const lineManagerMatrixId = cycleResponse.data.line_manager_matrix_id;
        setMatrixId(lineManagerMatrixId);

        // Fetch matrix parameters
        const matrixResponse = await axios.get(
          `http://localhost:5000/api/matrices/${lineManagerMatrixId}`,
          config
        );

        console.log('Matrix response:', matrixResponse.data);

        if (matrixResponse.data.success) {
          const params = matrixResponse.data.data.parameters || [];
          setMatrixParameters(params.map(param => ({
            id: param.parameter_id,
            parameter: param.parameter_name,
            weight: param.weightage,
            description: param.description || ''
          })));

          // Fetch existing evaluation for this line manager and cycle
          const evaluationResponse = await axios.get(
            `http://localhost:5000/api/evaluations/line-manager/${state.lineManagerId || id}/${state.cycleId}`,
            config
          );

          console.log('Evaluation response:', evaluationResponse.data);

          if (evaluationResponse.data.success && evaluationResponse.data.evaluation) {
            const evalData = evaluationResponse.data.evaluation;
            
            // Pre-fill ratings and scores if evaluation exists
            if (evalData.details && evalData.details.length > 0) {
              const scores = {};
              evalData.details.forEach(detail => {
                if (detail.rating !== null) {
                  // Store rating, score will be auto-calculated
                  scores[detail.parameter_id] = {
                    rating: detail.rating,
                    score: detail.score
                  };
                }
              });
              setEvaluations(scores);
            }

            // Pre-fill feedback and recommendation
            if (evalData.comments) setFeedback(evalData.comments);
            if (evalData.recommendation) setRecommendation(evalData.recommendation);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch evaluation data: ' + (error.response?.data?.message || error.message));
        setError('Failed to fetch evaluation data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, state, navigate]);

  const handleRatingChange = (paramId, rating) => {
    const calculatedScore = (rating / 5) * 100;
    setEvaluations(prev => ({
      ...prev,
      [paramId]: {
        rating: rating,
        score: calculatedScore
      }
    }));
  };

  const calculateTotalScore = () => {
    let total = 0;
    matrixParameters.forEach(param => {
      const evaluation = evaluations[param.id];
      if (evaluation && evaluation.score !== undefined && evaluation.score !== null && evaluation.score !== '') {
        total += (param.weight / 100) * evaluation.score;
      }
    });
    return total.toFixed(2);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const totalScore = parseFloat(calculateTotalScore());

      // Save as draft (status: 'pending')
      const updateResponse = await axios.put(
        `http://localhost:5000/api/evaluations/line-manager/${lineManager.id}/${state.cycleId}`,
        {
          overall_score: totalScore,
          comments: feedback,
          recommendation: recommendation,
          status: 'pending',
          parameters: matrixParameters.map(param => ({
            parameter_id: param.id,
            rating: evaluations[param.id]?.rating || null
          }))
        },
        config
      );

      if (updateResponse.data.success) {
        toast.success('Draft saved successfully!');
      } else {
        throw new Error(updateResponse.data.message || 'Save failed');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Save failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAI = async () => {
    const allRated = matrixParameters.every(param => {
      const evaluation = evaluations[param.id];
      return evaluation && evaluation.rating !== undefined && evaluation.rating !== null && evaluation.rating !== '';
    });

    if (!allRated) {
      toast.error('Please rate all parameters before generating AI feedback.');
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.post(
        'http://localhost:5000/api/ai/generate-feedback',
        {
          role: lineManager.designation || 'Line Manager',
          parameters: matrixParameters.map(param => ({
            name: param.parameter,
            rating: Number(evaluations[param.id].rating),
            weight: Number(param.weight) || 0
          }))
        },
        config
      );

      if (response.data.success) {
        setAiResult({
          feedback: response.data.feedback,
          recommendations: response.data.recommendations || []
        });
        setShowAiModal(true);
      } else {
        toast.error('Unable to generate AI feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      toast.error('Unable to generate AI feedback. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiFeedback = () => {
    setFeedback(aiResult.feedback);
    setRecommendation(aiResult.recommendations.join('\n'));
    setShowAiModal(false);
    toast.success('AI feedback applied. You can edit before saving.');
  };

  const handleSubmit = async () => {
    if (!feedback || !recommendation) {
      toast.error('Please provide feedback and recommendations');
      return;
    }

    const allRated = matrixParameters.every(param => {
      const evaluation = evaluations[param.id];
      return evaluation && evaluation.rating !== undefined && evaluation.rating !== null && evaluation.rating !== '';
    });
    
    if (!allRated) {
      toast.error('Please provide ratings for all parameters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const totalScore = parseFloat(calculateTotalScore());

      // Update the existing evaluation
      const updateResponse = await axios.put(
        `http://localhost:5000/api/evaluations/line-manager/${lineManager.id}/${state.cycleId}`,
        {
          overall_score: totalScore,
          comments: feedback,
          recommendation: recommendation,
          status: 'completed',
          parameters: matrixParameters.map(param => ({
            parameter_id: param.id,
            rating: evaluations[param.id].rating
          }))
        },
        config
      );

      if (updateResponse.data.success) {
        toast.success('Line manager evaluation submitted successfully');
        navigate('/linemanager-evaluation', {
          state: {
            returnToCycleId: state.cycleId
          }
        });
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading || !lineManager) {
    return <div className="lm-eval-form-loading">Loading...</div>;
  }

  if (error) {
    return <div className="lm-eval-form-error">{error}</div>;
  }

  return (
    <div className="evaluation-container" style={{ margin: "-20px", padding: "0" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 0", background: "#f8f9fa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <button onClick={() => navigate('/linemanager-evaluation', { state: { returnToCycleId: state.cycleId } })} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>‹</button>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#111827" }}>Line Manager Evaluation</h1>
            <p style={{ margin: "4px 0 0", fontSize: "15px", color: "#6b7280" }}>Review and rate line manager performance parameters</p>
          </div>
        </div>

        {/* Line Manager card */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", borderTop: "6px solid #003366", padding: "22px 28px", display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px", height: "207px" }}>
          <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "700", color: "#2563eb", flexShrink: 0, overflow: "hidden", marginTop: "18px" }}>
            {lineManager.name ? lineManager.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 10px", fontFamily: "'Outfit', sans-serif", fontSize: "24px", lineHeight: "32px", fontWeight: "700", letterSpacing: "-0.6px", color: "#2B0F17" }}>{lineManager.name}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr", gap: "6px 4px" }}>
              <span><span style={{ marginRight: "6px" }}>👤</span><strong className="emp-info-label">Designation: </strong><span className="emp-info-value">{lineManager.designation}</span></span>
              <span><span style={{ marginRight: "6px" }}>✉️</span><strong className="emp-info-label">Email: </strong><span className="emp-info-value">{lineManager.email}</span></span>
              <span><span style={{ marginRight: "6px" }}>🏢</span><strong className="emp-info-label">Department: </strong><span className="emp-info-value">{lineManager.department}</span></span>
              <span><span style={{ marginRight: "6px" }}>📋</span><strong className="emp-info-label">Cycle: </strong><span className="emp-matrix-badge">{lineManager.cycleName}</span></span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, minWidth: "160px", background: "#F1F5F9", borderRadius: "10px", padding: "14px 18px", alignSelf: "center", marginLeft: "-60px", marginTop: "18px" }}>
            <p className="emp-info-label" style={{ margin: "0 0 4px" }}>Current Score</p>
            <p className="emp-info-value" style={{ margin: "0 0 4px", fontSize: "28px", fontWeight: "700", lineHeight: 1 }}>
              {calculateTotalScore()}<span style={{ fontSize: "14px", fontWeight: "400" }}> / 100</span>
            </p>
            <div style={{ width: "100%", height: "5px", background: "#e5e7eb", borderRadius: "3px", marginBottom: "5px" }}>
              <div style={{ width: `${Math.min(calculateTotalScore() || 0, 100)}%`, height: "100%", background: "#003366", borderRadius: "3px" }} />
            </div>
            <p className="emp-info-value" style={{ margin: 0, fontSize: "12px" }}>
              {matrixParameters.every(p => evaluations[p.id]?.rating) ? "✓ Final Score" : `Partial (${Object.keys(evaluations).filter(k => evaluations[k]?.rating).length}/${matrixParameters.length} rated)`}
            </p>
          </div>
        </div>
      </div>

      {/* Parameters Table */}
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
            {matrixParameters.map((param) => {
              const evaluation = evaluations[param.id] || {};
              const score = evaluation.score || 0;
              const weightedScore = ((param.weight / 100) * score).toFixed(2);
              return (
                <tr key={param.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td className="eval-param-name">{param.parameter}</td>
                  <td style={{ padding: "15px", textAlign: "center" }}><span className="eval-weightage-badge">{param.weight}%</span></td>
                  <td className="eval-rating-col" style={{ padding: "15px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <RatingInput value={evaluation.rating} onChange={(rating) => handleRatingChange(param.id, rating)} showLabel={false} />
                    </div>
                  </td>
                  <td className="eval-score-value" style={{ padding: "15px", textAlign: "center" }}>{score ? `${score}%` : "-"}</td>
                  <td className="eval-weighted-score" style={{ padding: "15px", textAlign: "center" }}>{weightedScore}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="eval-total-row">
              <td colSpan={5} className="eval-total-label" style={{ textAlign: "center", height: "69px", padding: "0 15px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "120px" }}>
                  <span>{matrixParameters.every(p => evaluations[p.id]?.rating) ? "Final Score" : "Current Score (Partial)"}</span>
                  <span className="eval-total-value">{calculateTotalScore()}</span>
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
                value={feedback} 
                onChange={e => setFeedback(e.target.value)} 
                rows={5} 
                placeholder="Enter overall feedback for this line manager..." 
                style={{ 
                  width: "100%", 
                  height: "100%",
                  padding: "14px 10px", 
                  border: "none", 
                  fontSize: "13px", 
                  resize: "vertical", 
                  fontFamily: "inherit", 
                  boxSizing: "border-box", 
                  background: "#fff",
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
                value={recommendation} 
                onChange={e => setRecommendation(e.target.value)} 
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
                  background: "#fff",
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
          <button onClick={() => navigate('/linemanager-evaluation', { state: { returnToCycleId: state.cycleId } })} className="eval-back-btn">Back to List</button>
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
            <button onClick={handleSubmit} className="eval-submit-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: "rotate(45deg)" }}><path d="M17.5 2.5L9.167 10.833" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.5 2.5L12.5 17.5L9.167 10.833L2.5 7.5L17.5 2.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Submit Evaluation
            </button>
          </div>
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

export default EvaluateLineManager; 