-- Migration: Change from Score-based to Rating-based Evaluation System
-- This script converts the evaluation system from direct score entry (0-100)
-- to a 1-5 rating scale with automatic score calculation

-- Step 1: Add rating column to evaluation_details table
ALTER TABLE `evaluation_details` 
ADD COLUMN `rating` TINYINT(1) DEFAULT NULL COMMENT 'Rating from 1-5' AFTER `parameter_id`,
ADD CONSTRAINT `chk_rating_range` CHECK (`rating` >= 1 AND `rating` <= 5);

-- Step 2: Migrate existing scores to ratings (reverse calculation)
-- This converts existing scores to the nearest rating
UPDATE `evaluation_details`
SET `rating` = CASE
    WHEN `score` >= 90 THEN 5
    WHEN `score` >= 70 THEN 4
    WHEN `score` >= 50 THEN 3
    WHEN `score` >= 30 THEN 2
    ELSE 1
END
WHERE `score` IS NOT NULL;

-- Step 3: Drop and recreate the update trigger to auto-calculate score from rating
DROP TRIGGER IF EXISTS `after_evaluation_detail_update`;

DELIMITER $$
CREATE TRIGGER `before_evaluation_detail_insert` 
BEFORE INSERT ON `evaluation_details` 
FOR EACH ROW 
BEGIN
    -- Auto-calculate score from rating (rating/5 * 100)
    IF NEW.rating IS NOT NULL THEN
        SET NEW.score = (NEW.rating / 5.0) * 100;
    END IF;
END$$

CREATE TRIGGER `before_evaluation_detail_update` 
BEFORE UPDATE ON `evaluation_details` 
FOR EACH ROW 
BEGIN
    -- Auto-calculate score from rating (rating/5 * 100)
    IF NEW.rating IS NOT NULL THEN
        SET NEW.score = (NEW.rating / 5.0) * 100;
    END IF;
END$$

CREATE TRIGGER `after_evaluation_detail_update_score` 
AFTER UPDATE ON `evaluation_details` 
FOR EACH ROW 
BEGIN
    DECLARE total_weighted_score DECIMAL(10,2);
    DECLARE total_weightage DECIMAL(10,2);
    DECLARE v_matrix_id INT;
    DECLARE v_rating_id INT;
    DECLARE v_rating_name VARCHAR(50);
    
    -- Get the matrix_id for this evaluation
    SELECT cta.matrix_id INTO v_matrix_id
    FROM evaluations ev
    LEFT JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
    WHERE ev.id = NEW.evaluation_id;
    
    -- Calculate total weighted score for this evaluation
    SELECT 
        SUM(ed.score * pm.weightage / 100),
        SUM(pm.weightage)
    INTO total_weighted_score, total_weightage
    FROM evaluation_details ed
    INNER JOIN parameter_matrices pm ON ed.parameter_id = pm.parameter_id
        AND pm.matrix_id = v_matrix_id
    WHERE ed.evaluation_id = NEW.evaluation_id
    AND ed.score IS NOT NULL;
    
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
END$$

DELIMITER ;

-- Step 4: Add index for better performance on rating column
ALTER TABLE `evaluation_details` 
ADD INDEX `idx_rating` (`rating`);

-- Step 5: Update table comment to reflect new rating system
ALTER TABLE `evaluation_details` 
COMMENT = 'Stores evaluation details with 1-5 rating scale (auto-calculates score)';

-- Step 6: Create a view for easy rating-to-score reference
CREATE OR REPLACE VIEW `rating_score_reference` AS
SELECT 
    1 AS rating, 20.00 AS score, 'Poor' AS label
UNION ALL SELECT 2, 40.00, 'Below Average'
UNION ALL SELECT 3, 60.00, 'Average'
UNION ALL SELECT 4, 80.00, 'Good'
UNION ALL SELECT 5, 100.00, 'Excellent';

-- Verification queries (run these to check the migration)
-- SELECT rating, score, label FROM rating_score_reference;
-- SELECT id, evaluation_id, parameter_id, rating, score FROM evaluation_details LIMIT 10;
