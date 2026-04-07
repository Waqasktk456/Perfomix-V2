/**
 * Frontend AI Analysis Service
 * Calls the Node.js backend which proxies to the Python FastAPI AI service.
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Trigger full AI analysis for a completed evaluation.
 * Call this after evaluation submission.
 * @param {number} evaluationId
 */
export async function analyzeEvaluation(evaluationId) {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(
    `${API_BASE}/ai/analyze-evaluation/${evaluationId}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

/**
 * Get stored AI results for an evaluation (for display in reports).
 * @param {number} evaluationId
 */
export async function getAIResults(evaluationId) {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(
    `${API_BASE}/ai/results/${evaluationId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

/**
 * Analyze sentiment for a single feedback text (live, during form fill).
 * @param {string} feedback
 */
export async function analyzeParameterFeedback(feedback) {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(
    `${API_BASE}/ai/analyze-parameter`,
    { feedback },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
