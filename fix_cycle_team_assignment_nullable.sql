-- Make cycle_team_assignment_id nullable for line manager evaluations
ALTER TABLE evaluations 
MODIFY COLUMN cycle_team_assignment_id INT NULL;

-- Make score nullable in evaluation_details (scores are filled later during evaluation)
ALTER TABLE evaluation_details 
MODIFY COLUMN score DECIMAL(5,2) NULL;
