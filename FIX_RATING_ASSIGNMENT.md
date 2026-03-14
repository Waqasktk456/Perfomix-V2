# Fix: Automatic Rating Assignment for Evaluations

## Problem
The `rating_id` and `rating_name` columns in the `evaluations` table were NULL after completing evaluations. These should be automatically assigned based on the `overall_score`.

## Solution Implemented

### 1. Updated Backend Controllers

#### File: `server/controllers/lineManagerController.js`
**Function**: `submitEvaluation`

Added automatic rating assignment when evaluation is submitted:
```javascript
// Get the performance rating based on the overall score
const [[ratingResult]] = await connection.query(`
  SELECT id, name
  FROM performance_ratings
  WHERE min_score <= ? AND max_score >= ?
  ORDER BY min_score DESC
  LIMIT 1
`, [finalScore, finalScore]);

const ratingId = ratingResult ? ratingResult.id : null;
const ratingName = ratingResult ? ratingResult.name : null;

// Update with rating_id and rating_name
await connection.query(`
  UPDATE evaluations 
  SET status = 'completed', 
      overall_score = ?,
      rating_id = ?,
      rating_name = ?,
      submitted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`, [finalScore, ratingId, ratingName, evaluation_id]);
```

### 2. Updated API Routes

#### File: `server/routes/evaluations.js`
**Endpoint**: `PUT /line-manager/:employeeId/:cycleId`

Added automatic rating assignment for line manager evaluations:
```javascript
// Get the performance rating based on the overall score
const [[ratingResult]] = await connection.query(
  `SELECT id, name
   FROM performance_ratings
   WHERE min_score <= ? AND max_score >= ?
   ORDER BY min_score DESC
   LIMIT 1`,
  [overall_score, overall_score]
);

const ratingId = ratingResult ? ratingResult.id : null;
const ratingName = ratingResult ? ratingResult.name : null;

// Update with rating_id and rating_name
await connection.query(
  `UPDATE evaluations 
   SET overall_score = ?, comments = ?, areas_for_improvement = ?, 
       status = ?, rating_id = ?, rating_name = ?, updated_at = NOW()
   WHERE id = ?`,
  [overall_score, comments, recommendation, status, ratingId, ratingName, evaluationId]
);
```

### 3. Updated Database Trigger

#### File: `server/migrations/change_to_rating_system.sql`
**Trigger**: `after_evaluation_detail_update_score`

Enhanced the trigger to automatically assign rating when evaluation details are updated:
```sql
-- Get the performance rating based on the calculated score
SELECT id, name INTO v_rating_id, v_rating_name
FROM performance_ratings
WHERE min_score <= total_weighted_score AND max_score >= total_weighted_score
ORDER BY min_score DESC
LIMIT 1;

-- Update the evaluation's overall score, weighted score, and rating
UPDATE evaluations
SET 
    overall_score = ROUND(total_weighted_score, 2),
    weighted_score = ROUND(total_weighted_score, 2),
    rating_id = v_rating_id,
    rating_name = v_rating_name,
    updated_at = CURRENT_TIMESTAMP
WHERE id = NEW.evaluation_id;
```

### 4. Created Update Script for Existing Data

#### File: `server/migrations/update_existing_ratings.sql`

This script updates all existing completed evaluations that don't have ratings assigned:
```sql
UPDATE evaluations ev
LEFT JOIN performance_ratings pr ON ev.overall_score >= pr.min_score AND ev.overall_score <= pr.max_score
SET 
    ev.rating_id = pr.id,
    ev.rating_name = pr.name,
    ev.updated_at = CURRENT_TIMESTAMP
WHERE ev.overall_score IS NOT NULL 
  AND ev.status = 'completed'
  AND (ev.rating_id IS NULL OR ev.rating_name IS NULL);
```

## How It Works

1. **When evaluation is submitted**:
   - Overall score is calculated from weighted parameters
   - System queries `performance_ratings` table to find matching rating
   - `rating_id` and `rating_name` are automatically assigned
   - Evaluation is marked as completed

2. **Rating Assignment Logic**:
   ```
   SELECT id, name FROM performance_ratings
   WHERE min_score <= overall_score AND max_score >= overall_score
   ORDER BY min_score DESC
   LIMIT 1
   ```

3. **Example**:
   - Overall Score: 85
   - System finds rating where min_score <= 85 AND max_score >= 85
   - If rating is "Excellent" (90-100), assigns that rating
   - If rating is "Very Good" (80-89), assigns that rating

## Installation Steps

### Step 1: Update Database Trigger
If you already ran the main migration, you need to recreate the trigger:

```bash
mysql -u root -p saas_perfomix
```

Then run:
```sql
-- Drop old trigger
DROP TRIGGER IF EXISTS `after_evaluation_detail_update_score`;

-- Create new trigger (copy from change_to_rating_system.sql)
DELIMITER $$
CREATE TRIGGER `after_evaluation_detail_update_score` 
AFTER UPDATE ON `evaluation_details` 
FOR EACH ROW 
BEGIN
    -- ... (full trigger code from migration file)
END$$
DELIMITER ;
```

### Step 2: Update Existing Evaluations
Run the update script to fix existing evaluations:

```bash
mysql -u root -p saas_perfomix < server/migrations/update_existing_ratings.sql
```

### Step 3: Restart Backend Server
```bash
cd server
npm start
```

## Verification

After implementation, verify that ratings are being assigned:

```sql
-- Check recent evaluations
SELECT 
    id,
    employee_id,
    overall_score,
    rating_id,
    rating_name,
    status,
    submitted_at
FROM evaluations
WHERE status = 'completed'
ORDER BY submitted_at DESC
LIMIT 10;

-- Check if any completed evaluations are missing ratings
SELECT COUNT(*) as missing_ratings
FROM evaluations
WHERE status = 'completed' 
  AND overall_score IS NOT NULL
  AND (rating_id IS NULL OR rating_name IS NULL);
```

Expected result: `missing_ratings` should be 0.

## Testing

1. **Test Staff Evaluation**:
   - Log in as line manager
   - Complete an employee evaluation
   - Submit the evaluation
   - Check database: `rating_id` and `rating_name` should be populated

2. **Test Line Manager Evaluation**:
   - Log in as admin
   - Complete a line manager evaluation
   - Submit the evaluation
   - Check database: `rating_id` and `rating_name` should be populated

3. **Verify Rating Display**:
   - View completed evaluations in reports
   - Rating should display correctly (e.g., "Excellent", "Good", etc.)
   - Rating color should match the performance level

## Files Modified

1. `server/controllers/lineManagerController.js` - Added rating assignment in submitEvaluation
2. `server/routes/evaluations.js` - Added rating assignment in line manager evaluation update
3. `server/migrations/change_to_rating_system.sql` - Enhanced trigger to assign ratings
4. `server/migrations/update_existing_ratings.sql` - NEW: Script to fix existing data

## Benefits

✅ Automatic rating assignment - no manual intervention needed
✅ Consistent rating across all evaluations
✅ Rating updates automatically if score changes
✅ Works for both staff and line manager evaluations
✅ Existing evaluations can be updated with one SQL script

## Troubleshooting

### Issue: Ratings still NULL after submission
**Solution**: 
1. Check if `performance_ratings` table has data
2. Verify score ranges don't have gaps
3. Check trigger exists: `SHOW TRIGGERS LIKE 'evaluation_details';`

### Issue: Wrong rating assigned
**Solution**:
1. Check `performance_ratings` table for overlapping ranges
2. Verify min_score and max_score values
3. Run: `SELECT * FROM performance_ratings ORDER BY min_score;`

### Issue: Existing evaluations not updated
**Solution**:
Run the update script: `mysql -u root -p saas_perfomix < server/migrations/update_existing_ratings.sql`
