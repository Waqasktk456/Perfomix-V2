/**
 * AI Analysis Routes
 * Exposes AI feedback analysis to the React frontend via Node.js.
 * Stores AI results (summary, sentiment, flags) back into the evaluations table.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middlewares/authMiddleware');
const { analyzeParameter, analyzeEvaluation, checkHealth } = require('../services/aiAnalysisService');

router.use(verifyToken);

/**
 * POST /api/ai/analyze-evaluation/:evaluationId
 * Runs full AI analysis on a completed evaluation and stores results.
 */
router.post('/analyze-evaluation/:evaluationId', async (req, res) => {
  const { evaluationId } = req.params;

  try {
    // Fetch all parameter details for this evaluation
    const [details] = await db.query(
      `SELECT 
         ed.parameter_id,
         p.parameter_name,
         ed.rating,
         ed.comments,
         ed.recommendation
       FROM evaluation_details ed
       JOIN parameters p ON ed.parameter_id = p.id
       WHERE ed.evaluation_id = ? AND ed.deleted_at IS NULL`,
      [evaluationId]
    );

    if (!details.length) {
      return res.status(404).json({
        success: false,
        message: 'No evaluation details found for this evaluation'
      });
    }

    // Call AI service
    const aiResult = await analyzeEvaluation(details);

    // Store AI results in evaluations table
    await db.query(
      `UPDATE evaluations 
       SET ai_summary = ?, ai_sentiment = ?, ai_flags = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        aiResult.summary,
        aiResult.overall_sentiment,
        JSON.stringify(aiResult.flags),
        evaluationId
      ]
    );

    return res.json({
      success: true,
      evaluation_id: evaluationId,
      ...aiResult
    });
  } catch (err) {
    console.error('[AI Route] analyze-evaluation error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ai/analyze-parameter
 * Quick single-parameter sentiment check (used during evaluation form).
 */
router.post('/analyze-parameter', async (req, res) => {
  const { feedback } = req.body;

  if (!feedback) {
    return res.status(400).json({ success: false, message: 'feedback is required' });
  }

  try {
    const result = await analyzeParameter(feedback);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[AI Route] analyze-parameter error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ai/results/:evaluationId
 * Fetch stored AI analysis results for an evaluation.
 */
router.get('/results/:evaluationId', async (req, res) => {
  const { evaluationId } = req.params;

  try {
    const [[evaluation]] = await db.query(
      `SELECT ai_summary, ai_sentiment, ai_flags FROM evaluations WHERE id = ?`,
      [evaluationId]
    );

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluation not found' });
    }

    // Parse flags safely
    let flags = [];
    try {
      flags = evaluation.ai_flags
        ? (typeof evaluation.ai_flags === 'string' ? JSON.parse(evaluation.ai_flags) : evaluation.ai_flags)
        : [];
    } catch (e) { flags = []; }

    return res.json({
      success: true,
      evaluation_id: evaluationId,
      summary: evaluation.ai_summary || null,
      overall_sentiment: evaluation.ai_sentiment || null,
      flags
    });
  } catch (err) {
    // If ai columns don't exist yet, return empty gracefully
    console.error('[AI Route] results error:', err);
    return res.json({
      success: true,
      evaluation_id: evaluationId,
      summary: null,
      overall_sentiment: null,
      flags: []
    });
  }
});

/**
 * GET /api/ai/health
 * Check if the Python AI service is reachable.
 */
router.get('/health', async (req, res) => {
  const health = await checkHealth();
  return res.json(health);
});

module.exports = router;
