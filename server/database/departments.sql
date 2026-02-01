-- First, create the departments table
CREATE TABLE departments (
  Department_code VARCHAR(50) PRIMARY KEY,
  Organization_id VARCHAR(255) NOT NULL,
  Department_name VARCHAR(255) NOT NULL,
  Department_type ENUM('Technical', 'Administrative', 'HR', 'Finance', 'Other') NOT NULL,
  Parent_department VARCHAR(50),
  Number_of_employees INT DEFAULT 0,
  Department_email_address VARCHAR(255) NOT NULL,
  Department_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (Organization_id) REFERENCES organizations(Registeration_id),
  FOREIGN KEY (Parent_department) REFERENCES departments(Department_code)
);

-- Then, add indexes after table creation
ALTER TABLE departments ADD INDEX idx_dept_org (Organization_id);
ALTER TABLE departments ADD INDEX idx_dept_parent (Parent_department); 