import React, { useEffect, useState } from 'react';
import { getAIResults, analyzeEvaluation } from '../../services/aiAnalysisService';
import './AIFeedbackAnalysis.css';

/**
 * Displays AI-generated feedback analysis for an evaluation.
 * Can auto-trigger analysis if results don't exist yet.
 *
 * Props:
 *   evaluationId  - required
 *   autoAnalyze   - if true, triggers analysis on mount (use after submission)
 */
function AIFeedbackAnalysis({ evaluationId, autoAnalyze = false }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!evaluationId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (autoAnalyze) {
          const data = await analyzeEvaluation(evaluationId);
          setResult(data);
        } else {
          const data = await getAIResults(evaluationId);
          setResult(data);
        }
      } catch (err) {
        setError('AI analysis unavailable.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [evaluationId, autoAnalyze]);

  if (loading) return <div className="ai-loading">Analyzing feedback...</div>;
  if (error) return <div className="ai-error">{error}</div>;
  if (!result || !result.summary) return null;

  const sentimentClass = {
    POSITIVE: 'ai-sentiment--positive',
    NEGATIVE: 'ai-sentiment--negative',
    NEUTRAL: 'ai-sentiment--neutral'
  }[result.overall_sentiment] || 'ai-sentiment--neutral';

  return (
    <div className="ai-analysis-card">
      <h3 className="ai-analysis-title">AI Feedback Analysis</h3>

      <div className="ai-summary">
        <span className="ai-label">Summary</span>
        <p>{result.summary}</p>
      </div>

      <div className="ai-sentiment-row">
        <span className="ai-label">Overall Sentiment</span>
        <span className={`ai-sentiment-badge ${sentimentClass}`}>
          {result.overall_sentiment}
        </span>
      </div>

      {result.flags && result.flags.length > 0 && (
        <div className="ai-flags">
          <span className="ai-label">Quality Flags</span>
          <ul className="ai-flags-list">
            {result.flags.map((flag, i) => (
              <li key={i} className={`ai-flag ai-flag--${flag.type.toLowerCase()}`}>
                <span className="ai-flag-type">{flag.type.replace(/_/g, ' ')}</span>
                {flag.parameter_name && (
                  <span className="ai-flag-param"> [{flag.parameter_name}]</span>
                )}
                <span className="ai-flag-msg"> — {flag.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AIFeedbackAnalysis;
