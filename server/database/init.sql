-- DROP DATABASE IF EXISTS perfomix;
CREATE DATABASE IF NOT EXISTS perfomix;
USE perfomix;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    google_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(255),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert admin user
INSERT INTO users (google_id, email, name, role)
VALUES ('108416534730748820440', 'saisha2021@namal.edu.pk', 'Saisha Qandeel', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  Registeration_id INT AUTO_INCREMENT PRIMARY KEY,
  Organization_name VARCHAR(255) NOT NULL,
  Business_email_address VARCHAR(255) NOT NULL,
  Industry_type ENUM(
    'Information Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Telecommunications',
    'Construction',
    'Government',
    'Other'
  ) DEFAULT 'Other',
  Company_size ENUM('Small', 'Medium', 'Large') DEFAULT 'Small',
  description TEXT,
  Headquarters_location TEXT,
  Website_URL VARCHAR(255),
  Establishment_year INT,
  Operating_in_countries VARCHAR(255),
  Logo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_org_email ON organizations(Business_email_address);
CREATE INDEX idx_org_name ON organizations(Organization_name);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  Department_code VARCHAR(50) PRIMARY KEY,
  Organization_id INT NOT NULL,
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

-- Add indexes for performance
ALTER TABLE departments ADD INDEX idx_dept_org (Organization_id);
ALTER TABLE departments ADD INDEX idx_dept_parent (Parent_department);

-- Create employees table
CREATE TABLE employees (
    Employee_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Organization_id INT,
    Department_code VARCHAR(50) NULL,
    First_name VARCHAR(100),
    Last_name VARCHAR(100),
    Email VARCHAR(255) UNIQUE NOT NULL,
    user_password VARCHAR(255),
    Date_of_birth DATE,
    Marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed'),
    Permanent_address TEXT,
    Designation VARCHAR(100),
    Role ENUM('Admin', 'Line Manager', 'Staff') NOT NULL,
    Joining_date DATE,
    Employment_status ENUM('Full-time', 'Part-time', 'Contract', 'Intern') NULL,
    Salary DECIMAL(10, 2),
    Relative_name VARCHAR(100),
    Relationship_with_employee VARCHAR(50),
    Relative_address TEXT,
    Primary_contact_number VARCHAR(20),
    Alternate_contact_number VARCHAR(20),
    Profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Organization_id) REFERENCES organizations(Registeration_id),
    FOREIGN KEY (Department_code) REFERENCES departments(Department_code) ON DELETE SET NULL
);

-- Create parameters table
CREATE TABLE IF NOT EXISTS parameters (
    parameter_id INT AUTO_INCREMENT PRIMARY KEY,
    parameter_name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create performance matrices table
CREATE TABLE IF NOT EXISTS performance_matrices (
    matrix_id INT AUTO_INCREMENT PRIMARY KEY,
    matrix_name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (department_id) REFERENCES departments(Department_code) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES employees(Employee_id)
);

-- Create parameter_matrices table
CREATE TABLE IF NOT EXISTS parameter_matrices (
    matrix_parameter_id INT AUTO_INCREMENT PRIMARY KEY,
    parameter_id INT NOT NULL,
    matrix_id INT NOT NULL,
    weightage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    evaluator_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parameter_id) REFERENCES parameters(parameter_id),
    FOREIGN KEY (matrix_id) REFERENCES performance_matrices(matrix_id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_id) REFERENCES employees(Employee_id)
);

-- Create evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
    evaluation_id INT AUTO_INCREMENT PRIMARY KEY,
    matrix_id INT NOT NULL,
    employee_id INT NOT NULL,
    evaluator_id INT NOT NULL,
    evaluation_date DATE NOT NULL,
    overall_score DECIMAL(5,2),
    comments TEXT,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (matrix_id) REFERENCES performance_matrices(matrix_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(Employee_id),
    FOREIGN KEY (evaluator_id) REFERENCES employees(Employee_id)
);

-- Create evaluation_details table
CREATE TABLE IF NOT EXISTS evaluation_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    parameter_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(evaluation_id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES parameters(parameter_id)
);

-- Add indexes for better performance
CREATE INDEX idx_matrix_dept ON performance_matrices(department_id);
CREATE INDEX idx_param_matrix ON parameter_matrices(matrix_id);
CREATE INDEX idx_eval_matrix ON evaluations(matrix_id);
CREATE INDEX idx_eval_employee ON evaluations(employee_id);
CREATE INDEX idx_eval_details ON evaluation_details(evaluation_id);

-- Insert default parameters
INSERT INTO parameters (parameter_name, description, status) VALUES
('Teamwork', 'Working together to achieve common goals', 'active'),
('Productivity', 'Completing Tasks efficiency and on time', 'active'),
('Communication Skills', 'Clearly conveys ideas and information in both written and verbal formats.', 'active'),
('Attendance', 'Adheres to schedules and demonstrates reliability in presence.', 'active'),
('Ethics', 'Upholds integrity, fairness, and responsibility in all professional dealings.', 'active'),
('Customer Relation', 'Maintains a professional and responsive approach to client needs.', 'active'); 