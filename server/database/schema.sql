-- Create matrices table
CREATE TABLE IF NOT EXISTS matrices (
  matrix_id VARCHAR(50) PRIMARY KEY,
  matrix_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create matrix_parameters table
CREATE TABLE IF NOT EXISTS matrix_parameters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matrix_id VARCHAR(50) NOT NULL,
  parameter_id INT NOT NULL,
  weightage INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (matrix_id) REFERENCES matrices(matrix_id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES parameters(parameter_id) ON DELETE CASCADE,
  UNIQUE KEY unique_matrix_parameter (matrix_id, parameter_id)
);

-- Add indexes for better performance
CREATE INDEX idx_matrix_id ON matrices(matrix_id);
CREATE INDEX idx_matrix_parameters_matrix_id ON matrix_parameters(matrix_id);
CREATE INDEX idx_matrix_parameters_parameter_id ON matrix_parameters(parameter_id); 