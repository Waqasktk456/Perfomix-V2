# Fix: Overall Score Consistency Issue

## Problem
The overall score was showing different values in different places:
1. Performance report list showed one score
2. View performance page showed a different score
3. The `overall_score` column in evaluations table wasn't being used consistently

## Root Cause
1. The backend query used `COALESCE(ev.overall_score, calculated_score)` which would calculate on-the-fly if overall_score was NULL or 0
2. The frontend was always calculating the score from weighted parameters instead of using the stored value
3. Some old evaluations might not have overall_score properly stored

## Solution Implemented

### 1. Backend Fix (server/routes/evaluations.js)

**Changed the all-status query:**
```javascript
// OLD - Would calculate if overall_score was missing
CASE 
  WHEN ev.status = 'completed' THEN COALESCE(ev.overall_score, (
    SELECT SUM((ed.score * pmx.weightage) / 100)
    FROM evaluation_details ed
    ...
  ))
  ELSE 0
END AS overall_weighted_score

// NEW - Always use stored overall_score
CASE 
  WHEN ev.status = 'completed' THEN ev.overall_score
  ELSE 0
END AS overall_weighted_score
```

**Added overall_score to completed evaluations response:**
```javascript
// Now returns the stored overall_score
res.json({
  success: true,
  evaluation_id: evaluationId,
  overall_score: overallScoreRow?.overall_score || 0,  // ← Added this
  evaluations: rows
});
```

### 2. Frontend Fix (client/src/screens/Performance Report/view-performance-report.js)

**Added state for stored overall_score:**
```javascript
const [storedOverallScore, setStoredOverallScore] = useState(null);
```

**Updated to use stored score:**
```javascript
// Use stored overall_score if available, otherwise calculate
const totalScore = storedOverallScore || (performanceData.length > 0
  ? performanceData.reduce((acc, curr) => acc + (Number(curr.weightedScore) || 0), 0)
  : 0);
```

### 3. Database Fix Script (fix_overall_scores.sql)

Created a SQL script to recalculate and update all existing evaluations:

```sql
-- Updates staff evaluations
UPDATE evaluations ev
JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
SET ev.overall_score = (
    SELECT COALESCE(SUM((ed.score * pmx.weightage) / 100), 0)
    FROM evaluation_details ed
    JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id
    WHERE ed.evaluation_id = ev.id 
      AND pmx.matrix_id = cta.matrix_id
)
WHERE ev.status = 'completed' 
  AND ev.cycle_team_assignment_id IS NOT NULL;

-- Updates line manager evaluations
UPDATE evaluations ev
JOIN evaluation_cycles ec ON ev.cycle_id = ec.id
SET ev.overall_score = (
    SELECT COALESCE(SUM((ed.score * pmx.weightage) / 100), 0)
    FROM evaluation_details ed
    JOIN parameter_matrices pmx ON ed.parameter_id = pmx.parameter_id
    WHERE ed.evaluation_id = ev.id 
      AND pmx.matrix_id = ec.line_manager_matrix_id
)
WHERE ev.status = 'completed' 
  AND ev.cycle_team_assignment_id IS NULL
  AND ec.line_manager_matrix_id IS NOT NULL;
```

## How It Works Now

### When Evaluation is Submitted
1. Line manager completes all parameter scores
2. Backend calculates: `SUM((score * weightage) / 100)`
3. Stores result in `evaluations.overall_score`
4. This score is now the single source of truth

### When Viewing Performance Report List
1. Query fetches `ev.overall_score` directly
2. No calculation needed
3. Shows the exact score that was stored

### When Viewing Individual Performance
1. API returns `overall_score` from database
2. Frontend uses this stored value
3. Falls back to calculation only if stored value is missing
4. Same score displayed everywhere

## Benefits

✅ **Consistency** - Same score everywhere
✅ **Performance** - No need to recalculate
✅ **Accuracy** - Uses the score that was calculated at submission time
✅ **Historical** - Preserves the exact score from when evaluation was completed

## What You Need to Do

### Step 1: Run the Fix Script
```bash
mysql -u root -p saas_perfomix < fix_overall_scores.sql
```

This will:
- Recalculate overall_score for all existing completed evaluations
- Update both staff and line manager evaluations
- Show verification results

### Step 2: Restart Backend
```bash
cd server
node index.js
```

### Step 3: Test
1. Go to Performance Report page
2. Note the score shown in the list
3. Click "View" on an employee
4. Verify the score matches exactly
5. Check multiple employees

## Verification

After running the fix, you should see:
- ✅ Same score in performance report list
- ✅ Same score in view performance page
- ✅ Same score in staff dashboard
- ✅ Same score in PDF exports
- ✅ All scores are consistent

## Technical Notes

- The `overall_score` is calculated as: `SUM((parameter_score * parameter_weight) / 100)`
- This gives a weighted average out of 100
- The score is stored when evaluation status changes to 'completed'
- Frontend now prioritizes stored value over calculation
- Backend query simplified to always use stored value

## Files Modified

1. ✅ `server/routes/evaluations.js` - Updated queries
2. ✅ `client/src/screens/Performance Report/view-performance-report.js` - Use stored score
3. ✅ `fix_overall_scores.sql` - Database fix script (NEW)

## Result

Now the overall score is:
- Calculated once at submission
- Stored in database
- Used consistently everywhere
- Never recalculated (unless missing)

The score you see in the list is the exact same score you see when viewing details!
