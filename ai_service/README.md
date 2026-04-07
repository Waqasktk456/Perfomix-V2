# EPMS AI Feedback Analysis Service

FastAPI + HuggingFace BERT service for intelligent evaluation feedback analysis.

## Setup

```bash
cd ai_service
pip install -r requirements.txt
python main.py
# Service runs on http://localhost:8000
```

## Database Migration

Run once before using:
```sql
-- In MySQL
source ai_service/migration_add_ai_columns.sql
```

## API Endpoints

### POST /analyze-parameter
Single parameter sentiment analysis.
```json
// Request
{ "feedback": "The employee consistently delivers high quality work." }

// Response
{ "sentiment": "POSITIVE", "confidence": 0.9987 }
```

### POST /analyze-evaluation
Full evaluation analysis (all parameters).
```json
// Request
{
  "parameters": [
    { "parameter_id": 17, "parameter_name": "Communication", "rating": 4, "feedback": "Communicates clearly with the team." },
    { "parameter_id": 18, "parameter_name": "Teamwork", "rating": 2, "feedback": "Works well with everyone, great collaborator." }
  ]
}

// Response
{
  "summary": "The employee demonstrates strong communication skills and collaborative teamwork.",
  "overall_sentiment": "POSITIVE",
  "flags": [
    {
      "type": "INCONSISTENCY",
      "message": "Low rating (2/5) but positive sentiment detected",
      "parameter_id": 18,
      "parameter_name": "Teamwork"
    }
  ]
}
```

## Integration Flow

```
Line Manager submits evaluation
        ↓
Node.js: submitEvaluation() saves to DB
        ↓
Node.js: POST /api/ai/analyze-evaluation/:evaluationId
        ↓
aiAnalysisService.js → FastAPI /analyze-evaluation
        ↓
Results stored in evaluations.ai_summary / ai_sentiment / ai_flags
        ↓
React: <AIFeedbackAnalysis evaluationId={id} /> displays results
```

## Where to Integrate in Evaluation Submission

In `server/controllers/lineManagerController.js`, after the `submitEvaluation` success block:

```js
const { analyzeEvaluation } = require('../services/aiAnalysisService');

// After await connection.commit():
analyzeEvaluation(details).then(aiResult => {
  db.query(
    `UPDATE evaluations SET ai_summary=?, ai_sentiment=?, ai_flags=? WHERE id=?`,
    [aiResult.summary, aiResult.overall_sentiment, JSON.stringify(aiResult.flags), evaluation_id]
  );
}).catch(err => console.error('AI analysis failed (non-blocking):', err));
```

## What Gets Stored in DB

| Column | Table | Description |
|--------|-------|-------------|
| `ai_summary` | evaluations | 2-3 line professional summary |
| `ai_sentiment` | evaluations | POSITIVE / NEGATIVE / NEUTRAL |
| `ai_flags` | evaluations | JSON array of quality flags |
