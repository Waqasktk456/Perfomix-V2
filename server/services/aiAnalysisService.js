/**
 * AI Analysis Service
 * Bridges Node.js backend with the Python FastAPI AI service.
 * Maps evaluation_details fields (comments, recommendation, rating) to AI endpoints.
 */

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 30000, // 30s — summarization can be slow on CPU
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Analyze sentiment for a single parameter's feedback (evaluation_details.comments)
 * @param {string} feedback - The comments field from evaluation_details
 * @returns {{ sentiment: string, confidence: number }}
 */
async function analyzeParameter(feedback) {
  try {
    const { data } = await aiClient.post('/analyze-parameter', { feedback });
    return data;
  } catch (err) {
    console.error('[AI Service] analyzeParameter failed:', err.message);
    return { sentiment: 'NEUTRAL', confidence: 0 };
  }
}

/**
 * Analyze a full evaluation (all parameters combined).
 * Maps evaluation_details rows to the expected AI input format.
 *
 * @param {Array} parameters - Array of evaluation_details rows with:
 *   { parameter_id, parameter_name, rating, comments, recommendation }
 * @returns {{ summary, overall_sentiment, flags }}
 */
async function analyzeEvaluation(parameters) {
  try {
    // Map DB fields to AI service schema
    const payload = {
      parameters: parameters.map(p => ({
        parameter_id: p.parameter_id,
        parameter_name: p.parameter_name,
        rating: p.rating || 1,
        feedback: p.comments || '',
        recommendation: p.recommendation || ''
      }))
    };

    const { data } = await aiClient.post('/analyze-evaluation', payload);
    return data;
  } catch (err) {
    console.error('[AI Service] analyzeEvaluation failed:', err.message);
    return {
      summary: 'AI analysis unavailable.',
      overall_sentiment: 'NEUTRAL',
      flags: []
    };
  }
}

/**
 * Check if the AI service is reachable
 */
async function checkHealth() {
  try {
    const { data } = await aiClient.get('/health');
    return data;
  } catch {
    return { status: 'unreachable' };
  }
}

module.exports = { analyzeParameter, analyzeEvaluation, checkHealth };
