-- Add line_manager_matrix_id column to evaluation_cycles table
ALTER TABLE evaluation_cycles 
ADD COLUMN line_manager_matrix_id INT NULL,
ADD CONSTRAINT fk_cycle_lm_matrix 
  FOREIGN KEY (line_manager_matrix_id) 
  REFERENCES performance_matrices(id) 
  ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_cycle_lm_matrix ON evaluation_cycles(line_manager_matrix_id);
