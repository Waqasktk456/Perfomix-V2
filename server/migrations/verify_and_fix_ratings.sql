-- Verification and Fix Script for Rating Values
-- This script checks for missing ratings and fixes them

-- Step 1: Check current state of evaluation_details
SELECT 
    'Total Records' AS description,
    COUNT(*) AS count
FROM evaluation_details
UNION ALL
SELECT 
    'Records with Rating' AS description,
    COUNT(*) AS count
FROM evaluation_details
WHERE rating IS NOT NULL
UNION ALL
SELECT 
    'Records with Score but no Rating' AS description,
    COUNT(*) AS count
FROM evaluation_details
WHERE score IS NOT NULL AND rating IS NULL
UNION ALL
SELECT 
    'Records with neither Rating nor Score' AS description,
    COUNT(*) AS count
FROM evaluation_details
WHERE score IS NULL AND rating IS NULL;

-- Step 2: Fix missing ratings by reverse-calculating from existing scores
-- This converts existing scores to the nearest rating
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

-- Step 3: Verify the fix
SELECT 
    'After Fix - Records with Rating' AS description,
    COUNT(*) AS count
FROM evaluation_details
WHERE rating IS NOT NULL;

-- Step 4: Show sample data to verify
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

-- Step 5: Check if rating column exists
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'evaluation_details'
    AND COLUMN_NAME = 'rating';
