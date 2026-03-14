-- Rollback Migration: Revert from Rating-based to Score-based System
-- Use this script if you need to undo the rating system changes

-- Step 1: Drop the rating-related triggers
DROP TRIGGER IF EXISTS `before_evaluation_detail_insert`;
DROP TRIGGER IF EXISTS `before_evaluation_detail_update`;
DROP TRIGGER IF EXISTS `after_evaluation_detail_update_score`;

-- Step 2: Recreate the original update trigger
DELIMITER $$
CREATE TRIGGER `after_evaluation_detail_update` 
AFTER UPDATE ON `evaluation_details` 
FOR EACH ROW 
BEGIN
    DECLARE total_weighted_score DECIMAL(10,2);
    DECLARE total_weightage DECIMAL(10,2);
    
    -- Calculate total weighted score for this evaluation
    SELECT 
        SUM(ed.score * pm.weightage / 100),
        SUM(pm.weightage)
    INTO total_weighted_score, total_weightage
    FROM evaluation_details ed
    INNER JOIN parameter_matrices pm ON ed.parameter_id = pm.parameter_id
    INNER JOIN evaluations ev ON ed.evaluation_id = ev.id
    WHERE ed.evaluation_id = NEW.evaluation_id
    AND ed.score IS NOT NULL;
    
    -- Update the evaluation's overall score
    UPDATE evaluations
    SET 
        overall_score = ROUND(total_weighted_score, 2),
        weighted_score = ROUND(total_weighted_score, 2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.evaluation_id;
END$$
DELIMITER ;

-- Step 3: Drop the rating score reference view
DROP VIEW IF EXISTS `rating_score_reference`;

-- Step 4: Remove the rating column and its constraint
ALTER TABLE `evaluation_details` 
DROP INDEX `idx_rating`,
DROP CHECK `chk_rating_range`,
DROP COLUMN `rating`;

-- Step 5: Update table comment back to original
ALTER TABLE `evaluation_details` 
COMMENT = 'Stores evaluation parameter scores';

-- Verification
-- SELECT id, evaluation_id, parameter_id, score FROM evaluation_details LIMIT 10;
