import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './EvaluateLineManager.css';

const EvaluateLineManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evaluator, setEvaluator] = useState(null);
  const [departmentMatrix, setDepartmentMatrix] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch evaluator details
        const evaluatorResponse = await axios.get(`http://localhost:5000/api/employees/${id}`);
        const evaluatorData = evaluatorResponse.data.data;
        console.log('Evaluator Data:', evaluatorData);
        console.log('Department code being used for matrix fetch:', evaluatorData.Department_code);

        // Fetch all matrices for debugging
        const allMatricesResponse = await axios.get('http://localhost:5000/api/matrices');
        console.log('All matrices:', allMatricesResponse.data.data);

        // Fetch all parameters assigned to this evaluator (across all matrices)
        const parametersResponse = await axios.get(`http://localhost:5000/api/parameters/by-evaluator/${evaluatorData.Employee_id}`);
        const parameters = parametersResponse.data; // If your backend returns {success, data}, use parametersResponse.data.data
        console.log('Parameters for evaluator:', parameters);

        setEvaluator({
          id: evaluatorData.Employee_id,
          name: `${evaluatorData.First_name} ${evaluatorData.Last_name}`,
          email: evaluatorData.Email,
          department: evaluatorData.Department_name,
          role: evaluatorData.Role,
          joinDate: evaluatorData.Join_date
        });

        setDepartmentMatrix(parameters.map(param => ({
          id: param.parameter_id,
          parameter: param.parameter_name,
          weight: param.weightage,
          description: param.description,
          matrix_id: param.matrix_id
        })));

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch evaluation data. Please check your connection or contact admin.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleScoreChange = (evalKey, score) => {
    if (score === "" || (score >= 0 && score <= 100)) {
      setEvaluations(prev => ({
        ...prev,
        [evalKey]: score === "" ? "" : score
      }));
    }
  };

  const calculateTotalScore = () => {
    let total = 0;
    departmentMatrix.forEach(param => {
      const evalKey = `${param.matrix_id}_${param.id}`;
      const score = evaluations[evalKey];
      if (score !== undefined && score !== null && score !== '') {
        total += (param.weight / 100) * score;
      }
    });
    return total.toFixed(2); // Show as a number, not a percent
  };

  const handleSubmit = async () => {
    if (!feedback || !recommendation) {
      toast.error('Please provide feedback and recommendations');
      return;
    }

    // Require a score for every parameter (composite key)
    const allScored = departmentMatrix.every(param => {
      const evalKey = `${param.matrix_id}_${param.id}`;
      return evaluations[evalKey] !== undefined && evaluations[evalKey] !== null && evaluations[evalKey] !== '';
    });
    if (!allScored) {
      toast.error('Please provide scores for all parameters');
      return;
    }

    // Group parameters by matrix_id
    const matrixGroups = {};
    departmentMatrix.forEach(param => {
      if (!matrixGroups[param.matrix_id]) matrixGroups[param.matrix_id] = [];
      matrixGroups[param.matrix_id].push(param);
    });

    try {
      // Use the employee ID from the URL as the evaluator ID since we're evaluating a Line Manager
      const evaluatorId = id; // This is the ID from useParams()
      console.log('Using evaluator ID:', evaluatorId);

      // Submit an evaluation for each matrix
      for (const [matrixId, params] of Object.entries(matrixGroups)) {
        // Calculate total score for this matrix
        let total = 0;
        params.forEach(param => {
          const evalKey = `${param.matrix_id}_${param.id}`;
          const score = evaluations[evalKey];
          if (score !== undefined && score !== null && score !== '') {
            total += (param.weight / 100) * score;
          }
        });

        const evaluationPayload = {
          matrix_id: matrixId,
          employee_id: id,
          evaluator_id: evaluatorId,
          overall_score: total,
          comments: feedback,
          recommendation: recommendation,
          status: 'submitted',
          evaluation_type: 'evaluator'
        };

        // Debug: log the payload
        console.log('Submitting evaluation with payload:', evaluationPayload);

        // Create evaluation record
        const evaluationResponse = await axios.post('http://localhost:5000/api/evaluations', evaluationPayload);

        if (evaluationResponse.data.success) {
          // Create evaluation details for each parameter (composite key)
          const evaluationId = evaluationResponse.data.evaluation_id;
          const detailPromises = params.map(param => {
            const evalKey = `${param.matrix_id}_${param.id}`;
            return axios.post('http://localhost:5000/api/evaluations/details', {
              evaluation_id: evaluationId,
              parameter_id: param.id,
              score: evaluations[evalKey],
              comments: feedback
            });
          });

          await Promise.all(detailPromises);
        }
      }
      toast.success('Evaluation(s) submitted successfully');
      navigate('/linemanager-evaluation');
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading || !evaluator) {
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
        <span className="active">Evaluate {evaluator.name}</span>
      </div>

      <div className="lm-eval-form-content lm-eval-form-content-fullwidth" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="lm-eval-form-header" style={{ marginTop: 0 }}>
          <div className="lm-eval-form-manager-info">
            <h2 style={{ marginTop: 0 }}>Evaluate Department Evaluator</h2>
            <div className="lm-eval-form-info-grid">
              <div className="lm-eval-form-info-item">
                <label>Name</label>
                <span>{evaluator.name}</span>
              </div>
              <div className="lm-eval-form-info-item">
                <label>Email</label>
                <span>{evaluator.email}</span>
              </div>
              <div className="lm-eval-form-info-item">
                <label>Department</label>
                <span>{evaluator.department}</span>
              </div>
              <div className="lm-eval-form-info-item">
                <label>Role</label>
                <span>{evaluator.role}</span>
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
                {departmentMatrix.map(parameter => {
                  const evalKey = `${parameter.matrix_id}_${parameter.id}`;
                  const rawScore = evaluations[evalKey];
                  const score = rawScore === undefined || rawScore === null || rawScore === '' ? '' : rawScore;
                  const weightedScore = ((parameter.weight / 100) * (score || 0)).toFixed(2);
                  return (
                    <tr key={evalKey}>
                      <td>{parameter.parameter}</td>
                      <td>{parameter.description}</td>
                      <td>{parameter.weight}%</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score}
                          onChange={(e) => handleScoreChange(evalKey, e.target.value === "" ? "" : parseInt(e.target.value))}
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