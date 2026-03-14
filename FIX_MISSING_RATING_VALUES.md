# Fix Missing Rating Values in Evaluation Details

## Problem
The rating column shows up in the dashboard but the rating values are not being displayed. This is because:
1. The `rating` column was added to `evaluation_details` table
2. Existing evaluations may not have rating values populated
3. New evaluations should automatically have ratings, but old ones need to be migrated

## Solution

### Step 1: Verify the Issue
Run this query to check the current state:

```sql
-- Check if rating column exists and has data
SELECT 
    id,
    evaluation_id,
    parameter_id,
    rating,
    score,
    comments
FROM evaluation_details
ORDER BY id DESC
LIMIT 20;
```

### Step 2: Run the Verification and Fix Script
Execute the script: `server/migrations/verify_and_fix_ratings.sql`

This script will:
1. Show statistics about missing ratings
2. Convert existing scores to ratings using this logic:
   - Score >= 90 → Rating 5 (Excellent)
   - Score >= 70 → Rating 4 (Good)
   - Score >= 50 → Rating 3 (Average)
   - Score >= 30 → Rating 2 (Below Average)
   - Score > 0 → Rating 1 (Poor)
3. Verify the fix worked

### Step 3: Alternative - Manual Fix
If you prefer to run the fix manually, execute this SQL:

```sql
-- Fix missing ratings by reverse-calculating from existing scores
UPDATE `evaluation_details`
SET `rating` = CASE
    WHEN `score` >= 90 THEN 5
    WHEN `score` >= 70 THEN 4
    WHEN `score` >= 50 THEN 3
    WHEN `score` >= 30 THEN 2
    WHEN `score` > 0 THEN 1
    ELSE NULL
END
WHERE `score` IS NOT NULL AND `rating` IS NULL;
```

### Step 4: Verify the Fix
After running the fix, check the data:

```sql
-- Verify ratings are now populated
SELECT 
    COUNT(*) as total_records,
    COUNT(rating) as records_with_rating,
    COUNT(*) - COUNT(rating) as records_without_rating
FROM evaluation_details;

-- Show sample data
SELECT 
    ed.id,
    ed.evaluation_id,
    p.parameter_name,
    ed.rating,
    ed.score,
    ed.comments
FROM evaluation_details ed
JOIN parameters p ON ed.parameter_id = p.id
ORDER BY ed.id DESC
LIMIT 10;
```

### Step 5: Test in the Application
1. Restart your backend server (if needed)
2. Refresh the staff dashboard
3. Check if rating values now appear in the "Rating (1-5)" column

## Backend Logging
The backend now logs the data being returned. Check your server console for:
```
Staff evaluation parameters: [...]
```

This will show you exactly what data is being sent to the frontend, including the rating values.

## Expected Result
After the fix:
- All existing evaluations should have rating values (1-5)
- The rating column in dashboards should display these values
- New evaluations will automatically have ratings when created

## Notes
- The rating-to-score conversion is automatic via database triggers
- Rating values are: 1=20%, 2=40%, 3=60%, 4=80%, 5=100%
- The reverse calculation (score to rating) uses ranges to determine the closest rating
