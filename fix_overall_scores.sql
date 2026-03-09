-- Fix Overall Scores in Evaluations Table
-- This script recalculates and updates the overall_score for all completed evaluations
-- to ensure consistency across the system

-- Update staff evaluations (those with cycle_team_assignment_id)
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

-- Update line manager evaluations (those with NULL cycle_team_assignment_id)
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

-- Verify the update
SELECT 
    'Staff Evaluations' as type,
    COUNT(*) as total_evaluations,
    COUNT(CASE WHEN overall_score > 0 THEN 1 END) as with_scores,
    AVG(overall_score) as avg_score
FROM evaluations 
WHERE status = 'completed' AND cycle_team_assignment_id IS NOT NULL

UNION ALL

SELECT 
    'Line Manager Evaluations' as type,
    COUNT(*) as total_evaluations,
    COUNT(CASE WHEN overall_score > 0 THEN 1 END) as with_scores,
    AVG(overall_score) as avg_score
FROM evaluations 
WHERE status = 'completed' AND cycle_team_assignment_id IS NULL;
