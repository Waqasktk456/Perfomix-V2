# Rating System Implementation - Complete

## Summary
Successfully converted the evaluation system from direct score entry (0-100) to a 1-5 rating scale with automatic score calculation.

## Changes Made

### 1. Database Migration
**File**: `server/migrations/change_to_rating_system.sql`
- Added `rating` column (1-5) to `evaluation_details` table
- Created triggers to auto-calculate score from rating: `score = (rating / 5) * 100`
- Migrated existing scores to ratings
- Created `rating_score_reference` view

**Run this SQL file in your database before testing!**

### 2. Frontend Components

#### New Component: RatingInput
**Files Created**:
- `client/src/components/RatingInput.js`
- `client/src/components/RatingInput.css`

Features:
- Visual 1-5 rating selector with emojis
- Shows rating labels (Poor, Below Average, Average, Good, Excellent)
- Displays calculated score percentage
- Disabled state for view-only mode

#### Updated: Staff Evaluation Form
**File**: `client/src/LineManager/screens/evaluate-employee.js`

Changes:
- Imported `RatingInput` component
- Changed from `handleScoreChange` to `handleRatingChange`
- Updated state to store both `rating` and `score`
- Modified API calls to send `rating` instead of `score`
- Updated table to show: Rating (1-5), Score (auto-calculated), Weighted Score
- Changed validation messages from "score" to "rating"

#### Updated: Line Manager Evaluation Form
**File**: `client/src/screens/LineManagerEvaluation/EvaluateLineManager.js`

Changes:
- Imported `RatingInput` component
- Changed from `handleScoreChange` to `handleRatingChange`
- Updated state structure to store `{ rating, score }` objects
- Modified API calls to send `rating` instead of `score`
- Updated table to show: Rating (1-5), Score (auto-calculated), Weighted Score
- Changed validation from "all scored" to "all rated"

### 3. Backend Controllers

#### Line Manager Controller
**File**: `server/controllers/lineManagerController.js`

**Function**: `saveDraftEvaluation`
- Changed to accept `rating` (1-5) instead of `score` (0-100)
- Updated validation: rating must be between 1 and 5
- Modified SQL to insert `rating` column
- Score is auto-calculated by database trigger

**Function**: `submitEvaluation`
- Changed to accept `rating` instead of `score`
- Updated validation: rating must be between 1 and 5
- Modified SQL to insert `rating` column
- Updated error messages to mention "rating" instead of "score"

**Function**: `getEvaluationForm`
- Added `rating` to SELECT query
- Now returns both `rating` and `score` fields

### 4. Backend Routes

#### Evaluations Routes
**File**: `server/routes/evaluations.js`

**Endpoint**: `PUT /line-manager/:employeeId/:cycleId`
- Changed to accept `rating` in parameters array
- Modified SQL to insert `rating` instead of `score`
- Score is auto-calculated by database trigger

## Rating to Score Mapping

| Rating | Score | Label          | Emoji |
|--------|-------|----------------|-------|
| 1      | 20%   | Poor           | 😞    |
| 2      | 40%   | Below Average  | 😐    |
| 3      | 60%   | Average        | 🙂    |
| 4      | 80%   | Good           | 😊    |
| 5      | 100%  | Excellent      | 🤩    |

## API Changes

### Request Format (Before)
```json
{
  "evaluation_id": 123,
  "parameters": [
    {
      "parameter_id": 17,
      "score": 85,
      "comments": "Good work"
    }
  ]
}
```

### Request Format (After)
```json
{
  "evaluation_id": 123,
  "parameters": [
    {
      "parameter_id": 17,
      "rating": 4,
      "comments": "Good work"
    }
  ]
}
```

### Response Format
```json
{
  "success": true,
  "parameters": [
    {
      "parameter_id": 17,
      "parameter_name": "Communication",
      "weightage": 20,
      "rating": 4,
      "score": 80,
      "feedback": "Good work"
    }
  ]
}
```

Note: `score` is still returned but is now auto-calculated from `rating`.

## Testing Checklist

- [ ] Run database migration SQL
- [ ] Test staff evaluation (line manager evaluating employees)
  - [ ] Rating selector appears
  - [ ] Score auto-calculates correctly
  - [ ] Save draft works
  - [ ] Submit evaluation works
  - [ ] View completed evaluation shows ratings
- [ ] Test line manager evaluation (admin evaluating line managers)
  - [ ] Rating selector appears
  - [ ] Score auto-calculates correctly
  - [ ] Submit evaluation works
  - [ ] View completed evaluation shows ratings
- [ ] Test reports still work correctly
- [ ] Test PDF exports show correct scores
- [ ] Verify overall scores calculate correctly

## Files Modified

### Frontend
1. `client/src/components/RatingInput.js` (NEW)
2. `client/src/components/RatingInput.css` (NEW)
3. `client/src/LineManager/screens/evaluate-employee.js`
4. `client/src/screens/LineManagerEvaluation/EvaluateLineManager.js`

### Backend
1. `server/controllers/lineManagerController.js`
2. `server/routes/evaluations.js`

### Database
1. `server/migrations/change_to_rating_system.sql` (NEW)
2. `server/migrations/rollback_rating_system.sql` (NEW)
3. `server/migrations/RATING_SYSTEM_MIGRATION_GUIDE.md` (NEW)

## Next Steps

1. **Run the database migration**:
   ```bash
   mysql -u root -p saas_perfomix < server/migrations/change_to_rating_system.sql
   ```

2. **Restart your backend server**:
   ```bash
   cd server
   npm start
   ```

3. **Restart your frontend**:
   ```bash
   cd client
   npm start
   ```

4. **Test the evaluation forms**:
   - Log in as a line manager
   - Navigate to evaluate an employee
   - You should see the new rating selector (1-5 with emojis)
   - Select ratings and verify scores calculate correctly
   - Submit and verify it saves

5. **Test admin line manager evaluation**:
   - Log in as admin
   - Navigate to line manager evaluation
   - Evaluate a line manager using the rating system
   - Verify it works correctly

## Rollback Instructions

If you need to revert:
```bash
mysql -u root -p saas_perfomix < server/migrations/rollback_rating_system.sql
```

Then revert the code changes using git:
```bash
git checkout HEAD -- client/src/LineManager/screens/evaluate-employee.js
git checkout HEAD -- client/src/screens/LineManagerEvaluation/EvaluateLineManager.js
git checkout HEAD -- server/controllers/lineManagerController.js
git checkout HEAD -- server/routes/evaluations.js
```

## Benefits of Rating System

1. **Simpler for evaluators**: Just pick 1-5 instead of guessing a score
2. **More consistent**: Standardized ratings across all evaluators
3. **Automatic calculation**: No manual score entry errors
4. **Better UX**: Visual rating selector with emojis and labels
5. **Backward compatible**: Existing reports and calculations still work

## Support

If you encounter any issues:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify database migration ran successfully
4. Ensure all files were updated correctly
5. Test with a fresh evaluation (not an existing one)
