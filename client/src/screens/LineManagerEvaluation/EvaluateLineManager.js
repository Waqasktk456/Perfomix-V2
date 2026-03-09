import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './EvaluateLineManager.css';

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
          navigate('/linemanager-evaluation');
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
            
            // Pre-fill scores if evaluation exists
            if (evalData.details && evalData.details.length > 0) {
              const scores = {};
              evalData.details.forEach(detail => {
                if (detail.score !== null) {
                  scores[detail.parameter_id] = detail.score;
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

  const handleScoreChange = (paramId, score) => {
    if (score === "" || (score >= 0 && score <= 100)) {
      setEvaluations(prev => ({
        ...prev,
        [paramId]: score === "" ? "" : score
      }));
    }
  };

  const calculateTotalScore = () => {
    let total = 0;
    matrixParameters.forEach(param => {
      const score = evaluations[param.id];
      if (score !== undefined && score !== null && score !== '') {
        total += (param.weight / 100) * score;
      }
    });
    return total.toFixed(2);
  };

  const handleSubmit = async () => {
    if (!feedback || !recommendation) {
      toast.error('Please provide feedback and recommendations');
      return;
    }

    const allScored = matrixParameters.every(param => {
      return evaluations[param.id] !== undefined && evaluations[param.id] !== null && evaluations[param.id] !== '';
    });
    
    if (!allScored) {
      toast.error('Please provide scores for all parameters');
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
            score: evaluations[param.id]
          }))
        },
        config
      );

      if (updateResponse.data.success) {
        toast.success('Line manager evaluation submitted successfully');
        navigate('/linemanager-evaluation');
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
    <div className="lm-eval-form-container lm-eval-form-fullwidth" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="lm-eval-form-breadcrumb">
        <span onClick={() => navigate('/linemanager-evaluation')} style={{ cursor: 'pointer' }}>
          Line Manager Evaluation
        </span>
        <span className="separator">›</span>
        <span className="active">Evaluate {lineManager.name}</span>
      </div>

      <div className="lm-eval-form-content lm-eval-form-content-fullwidth" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="lm-eval-form-header" style={{ marginTop: 0 }}>
          <div className="lm-eval-form-manager-info">
            <h2 style={{ marginTop: 0 }}>Evaluate Line Manager</h2>
            <div className="lm-eval-form-info-grid">
              <div className="lm-eval-form-info-item">
                <label>Name</label>
                <span>{lineManager.name}</span>
              </div>
              <div className="lm-eval-form-info-item">
                <label>Email</label>
                <span>{lineManager.email}</span>
              </div>
              <div className="lm-eval-form-info-item">
                <label>Department</label>
                <span>{lineManager.department}</span>
              </div>
              <div className="lm-eval-form-info-item">
                <label>Designation</label>
                <span>{lineManager.designation}</span>
              </div>
              <div className="lm-eval-form-info-item">
                <label>Evaluation Cycle</label>
                <span>{lineManager.cycleName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lm-eval-form-matrix">
          <h3>Performance Matrix Evaluation</h3>
          <div className="lm-eval-form-table-wrapper">
            <table className="lm-eval-form-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Description</th>
                  <th>Weight</th>
                  <th>Score</th>
                  <th>Weighted Score</th>
                </tr>
              </thead>
              <tbody>
                {matrixParameters.map(parameter => {
                  const score = evaluations[parameter.id];
                  const weightedScore = ((parameter.weight / 100) * (score || 0)).toFixed(2);
                  return (
                    <tr key={parameter.id}>
                      <td>{parameter.parameter}</td>
                      <td>{parameter.description}</td>
                      <td>{parameter.weight}%</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score === undefined || score === null ? '' : score}
                          onChange={(e) => handleScoreChange(parameter.id, e.target.value === "" ? "" : parseInt(e.target.value))}
                          className="lm-eval-form-score-input"
                        />
                      </td>
                      <td>{weightedScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modern feedback & recommendation card, styled like evaluate-employee */}
          <div className="lm-eval-form-feedback-section">
            <div className="lm-eval-form-feedback-group">
              <label htmlFor="feedback" className="lm-eval-form-label">Feedback</label>
              <textarea
                id="feedback"
                className="lm-eval-form-textarea lm-eval-form-textarea-large"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter feedback here"
                rows={5}
              />
            </div>
            <div className="lm-eval-form-feedback-group">
              <label htmlFor="recommendation" className="lm-eval-form-label">Recommendation</label>
              <textarea
                id="recommendation"
                className="lm-eval-form-textarea lm-eval-form-textarea-large"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="Enter recommendation here"
                rows={5}
              />
            </div>
          </div>

          <div className="lm-eval-form-summary">
            <div className="lm-eval-form-total-score">
              <label>Total Score</label>
              <span>{calculateTotalScore()}</span>
            </div>
            <div className="lm-eval-form-actions">
              <button 
                className="lm-eval-form-cancel-btn"
                onClick={() => navigate('/linemanager-evaluation')}
              >
                Cancel
              </button>
              <button 
                className="lm-eval-form-submit-btn"
                onClick={handleSubmit}
              >
                Submit Evaluation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluateLineManager; 