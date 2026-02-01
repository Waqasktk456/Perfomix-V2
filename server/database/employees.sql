-- Use the database
USE perfomix;

-- Create Employee table
CREATE TABLE IF NOT EXISTS Employee (
  EmployeeID INT AUTO_INCREMENT PRIMARY KEY,
  First_name VARCHAR(255) NOT NULL,
  Last_name VARCHAR(255) NOT NULL,
  Email VARCHAR(255) NOT NULL UNIQUE,
  user_password VARCHAR(255) NOT NULL,
  Date_of_birth DATE,
  Marital_status VARCHAR(50),
  Province VARCHAR(100),
  City VARCHAR(100),
  District VARCHAR(100),
  Permanent_address TEXT,
  Department VARCHAR(100),
  Designation VARCHAR(100),
  Role VARCHAR(50),
  Joining_date DATE,
  Employment_status VARCHAR(50),
  Salary DECIMAL(10,2),
  Relative_name VARCHAR(255),
  Relationship_with_employee VARCHAR(100),
  Relative_address TEXT,
  Primary_contact_number VARCHAR(20),
  Alternate_contact_number VARCHAR(20),
  Profile_image VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_employee_email ON Employee(Email);
CREATE INDEX idx_employee_department ON Employee(Department);
CREATE INDEX idx_employee_role ON Employee(Role); 