-- QUICK FIX: Populate missing rating values in evaluation_details
-- Run this script to fix existing evaluations that don't have rating values

-- This converts existing scores to ratings using this logic:
-- Score 90-100 = Rating 5 (Excellent)
-- Score 70-89  = Rating 4 (Good)
-- Score 50-69  = Rating 3 (Average)
-- Score 30-49  = Rating 2 (Below Average)
-- Score 1-29   = Rating 1 (Poor)

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

-- Verify the fix worked
SELECT 
    'Total evaluation details' AS info,
    COUNT(*) AS count
FROM evaluation_details
UNION ALL
SELECT 
    'Details with rating' AS info,
    COUNT(*) AS count
FROM evaluation_details
WHERE rating IS NOT NULL;

-- Show sample data
SELECT 
    id,
    evaluation_id,
    parameter_id,
    rating,
    score
FROM evaluation_details
ORDER BY id DESC
LIMIT 10;
