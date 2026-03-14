-- Update existing evaluations to assign rating_id and rating_name based on overall_score
-- Run this after the main migration if you have existing completed evaluations

UPDATE evaluations ev
LEFT JOIN performance_ratings pr ON ev.overall_score >= pr.min_score AND ev.overall_score <= pr.max_score
SET 
    ev.rating_id = pr.id,
    ev.rating_name = pr.name,
    ev.updated_at = CURRENT_TIMESTAMP
WHERE ev.overall_score IS NOT NULL 
  AND ev.status = 'completed'
  AND (ev.rating_id IS NULL OR ev.rating_name IS NULL);

-- Verify the update
SELECT 
    COUNT(*) as total_evaluations,
    COUNT(rating_id) as evaluations_with_rating,
    COUNT(*) - COUNT(rating_id) as evaluations_without_rating
FROM evaluations
WHERE status = 'completed' AND overall_score IS NOT NULL;
