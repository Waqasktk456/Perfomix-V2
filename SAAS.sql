DROP DATABASE IF EXISTS saas_perfomix;
CREATE DATABASE saas_perfomix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saas_perfomix;

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(255),
    organization_id INT,
    role ENUM('user','admin','super_admin') DEFAULT 'admin',
    has_completed_onboarding TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    last_login_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organization (organization_id),
    INDEX idx_email (email),
    INDEX idx_active (is_active, deleted_at)
) ENGINE=InnoDB;

-- Super admin user
INSERT INTO users (google_id, email, name, role, has_completed_onboarding) VALUES 
('108416534730748820440', 'dev03@gorex.ai', 'Saisha Qandeel', 'super_admin', 1);

-- ============================================================================
-- 2. ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    business_email VARCHAR(255) NOT NULL UNIQUE,
    industry_type VARCHAR(255) DEFAULT 'Other',
    company_size ENUM('1-10','11-50','51-200','201-500','501-1000','1000+') DEFAULT '1-10',
    description TEXT,
    headquarters_location VARCHAR(255),
    website_url VARCHAR(255),
    establishment_year INT,
    operating_countries TEXT,
    logo VARCHAR(255),
    subscription_tier ENUM('free','basic','professional','enterprise') DEFAULT 'free',
    subscription_status ENUM('active','inactive','trial','cancelled') DEFAULT 'trial',
    subscription_ends_at TIMESTAMP NULL,
    max_employees INT DEFAULT 10,
    created_by INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_by (created_by),
    INDEX idx_active (is_active, deleted_at),
    INDEX idx_subscription (subscription_status, subscription_ends_at),
    CONSTRAINT fk_org_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 3. DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    department_type VARCHAR(100) NOT NULL,
    parent_department_id INT NULL,
    number_of_employees INT DEFAULT 0,
    department_email VARCHAR(255) NOT NULL,
    department_description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_dept_code_org (organization_id, department_code),
    INDEX idx_organization (organization_id),
    INDEX idx_parent (parent_department_id),
    INDEX idx_active (is_active, deleted_at),
    CONSTRAINT fk_dept_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_dept_parent FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 4. TEAMS TABLE
-- ============================================================================
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    department_id INT NOT NULL,
    team_name VARCHAR(255) NOT NULL,
    team_description TEXT,
    line_manager_id INT NULL,
    is_active TINYINT(1) DEFAULT 1,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organization (organization_id),
    INDEX idx_department (department_id),
    INDEX idx_line_manager (line_manager_id),
    INDEX idx_active (is_active, deleted_at),
    CONSTRAINT fk_team_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    employee_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_team_employee (team_id, employee_id),

    INDEX idx_team (team_id),
    INDEX idx_employee (employee_id),

    CONSTRAINT fk_team_members_team
        FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_team_members_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 5. EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    department_id INT NULL,
    team_id INT NULL,
    user_id INT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    employee_code VARCHAR(50),
    designation VARCHAR(100),
    role VARCHAR(50) DEFAULT 'Staff',
    joining_date DATE,
    employment_status ENUM('Full-time','Part-time','Contract','Intern','Probation') DEFAULT 'Full-time',
    is_active TINYINT(1) DEFAULT 1,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_employee_email_org (organization_id, email),
    UNIQUE KEY unique_employee_code_org (organization_id, employee_code),
    INDEX idx_organization (organization_id),
    INDEX idx_department (department_id),
    INDEX idx_team (team_id),
    INDEX idx_user (user_id),
    INDEX idx_active (is_active, deleted_at),
    INDEX idx_employment_status (employment_status),
    CONSTRAINT fk_emp_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_emp_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_emp_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_emp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 6. PARAMETERS TABLE (Tenant-Specific)
-- ============================================================================
CREATE TABLE parameters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NULL,
    parameter_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    min_score DECIMAL(5,2) DEFAULT 0,
    max_score DECIMAL(5,2) DEFAULT 10,
    is_global TINYINT(1) DEFAULT 0,
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organization (organization_id),
    INDEX idx_global (is_global),
    INDEX idx_status (status, deleted_at),
    CONSTRAINT fk_param_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Global default parameters (available to all organizations)
INSERT INTO parameters (organization_id, parameter_name, description, is_global, status) VALUES
(NULL, 'Teamwork', 'Working together to achieve common goals', 1, 'active'),
(NULL, 'Productivity', 'Completing tasks efficiently and on time', 1, 'active'),
(NULL, 'Communication Skills', 'Clearly conveys ideas and information', 1, 'active'),
(NULL, 'Attendance', 'Punctuality and presence', 1, 'active'),
(NULL, 'Ethics', 'Integrity and professional responsibility', 1, 'active'),
(NULL, 'Customer Relations', 'Client handling and service skills', 1, 'active'),
(NULL, 'Leadership', 'Ability to guide and motivate team members', 1, 'active'),
(NULL, 'Problem Solving', 'Analytical thinking and solution development', 1, 'active'),
(NULL, 'Initiative', 'Proactive approach to work and challenges', 1, 'active'),
(NULL, 'Quality of Work', 'Accuracy and attention to detail', 1, 'active');

-- ============================================================================
-- 7. PERFORMANCE MATRICES TABLE (TEMPLATE ONLY)
-- ============================================================================
CREATE TABLE performance_matrices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    matrix_name VARCHAR(255) NOT NULL,
    evaluation_period ENUM('monthly','quarterly','bi-annual','annual') DEFAULT 'quarterly',
    created_by INT NOT NULL,
    status ENUM('active','Draft','archived') DEFAULT 'active',
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_organization (organization_id),
    INDEX idx_created_by (created_by),
    INDEX idx_status (status, deleted_at),

    CONSTRAINT fk_matrix_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,

    CONSTRAINT fk_matrix_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- EVALUATION CYCLES (Evaluation Events)
-- ============================================================================
CREATE TABLE evaluation_cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    cycle_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('draft','active','closed','archived') DEFAULT 'draft',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_organization (organization_id),
    INDEX idx_status (status),

    CONSTRAINT fk_cycle_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,

    CONSTRAINT fk_cycle_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- ============================================================================
-- CYCLE–TEAM–MATRIX ASSIGNMENTS
-- ============================================================================
CREATE TABLE cycle_team_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id INT NOT NULL,
    team_id INT NOT NULL,
    matrix_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_cycle_team (cycle_id, team_id),

    INDEX idx_cycle (cycle_id),
    INDEX idx_team (team_id),
    INDEX idx_matrix (matrix_id),

    CONSTRAINT fk_cta_cycle 
        FOREIGN KEY (cycle_id) REFERENCES evaluation_cycles(id) ON DELETE CASCADE,

    CONSTRAINT fk_cta_team 
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,

    CONSTRAINT fk_cta_matrix 
        FOREIGN KEY (matrix_id) REFERENCES performance_matrices(id) ON DELETE RESTRICT
) ENGINE=InnoDB;


-- ============================================================================
-- 8. PARAMETER MATRICES (Matrix-Parameter Mapping with Weightage)
-- ============================================================================
CREATE TABLE parameter_matrices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matrix_id INT NOT NULL,
    parameter_id INT NOT NULL,
    weightage DECIMAL(5,2) DEFAULT 0.00,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_matrix_parameter (matrix_id, parameter_id),
    INDEX idx_matrix (matrix_id),
    INDEX idx_parameter (parameter_id),
    CONSTRAINT fk_pm_matrix FOREIGN KEY (matrix_id) REFERENCES performance_matrices(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_parameter FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE,
    CONSTRAINT chk_weightage CHECK (weightage >= 0 AND weightage <= 100)
) ENGINE=InnoDB;

-- ============================================================================
-- 9. EVALUATIONS TABLE
-- ============================================================================
CREATE TABLE evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    matrix_id INT NOT NULL,
    employee_id INT NOT NULL,
    evaluator_id INT NOT NULL,
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    evaluation_date DATE NOT NULL,
    overall_score DECIMAL(5,2),
    weighted_score DECIMAL(5,2),
    grade VARCHAR(5),
    comments TEXT,
    strengths TEXT,
    areas_for_improvement TEXT,
    status ENUM('draft','pending_review','completed','approved','rejected') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    approved_at TIMESTAMP NULL,
    approved_by INT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organization (organization_id),
    INDEX idx_matrix (matrix_id),
    INDEX idx_employee (employee_id),
    INDEX idx_evaluator (evaluator_id),
    INDEX idx_status (status),
    INDEX idx_evaluation_date (evaluation_date),
    INDEX idx_period (evaluation_period_start, evaluation_period_end),
    CONSTRAINT fk_eval_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_eval_matrix FOREIGN KEY (matrix_id) REFERENCES performance_matrices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_eval_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_eval_evaluator FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_eval_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 10. EVALUATION DETAILS (Individual Parameter Scores)
-- ============================================================================
CREATE TABLE evaluation_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    parameter_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    weighted_score DECIMAL(5,2),
    comments TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_eval_parameter (evaluation_id, parameter_id),
    INDEX idx_evaluation (evaluation_id),
    INDEX idx_parameter (parameter_id),
    CONSTRAINT fk_detail_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
    CONSTRAINT fk_detail_parameter FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 11. EVALUATION STATUS TRACKING
-- ============================================================================
CREATE TABLE evaluation_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    employee_id INT NOT NULL,
    parameter_id INT NOT NULL,
    status ENUM('pending','in_progress','completed','skipped') DEFAULT 'pending',
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_eval_emp_param (evaluation_id, employee_id, parameter_id),
    INDEX idx_evaluation (evaluation_id),
    INDEX idx_employee (employee_id),
    INDEX idx_parameter (parameter_id),
    INDEX idx_status (status),
    CONSTRAINT fk_status_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_parameter FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 12. AUDIT LOG (Track important changes)
-- ============================================================================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_organization (organization_id),
    INDEX idx_user (user_id),
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_audit_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 13. TRIGGERS
-- ============================================================================

-- Trigger: Auto-update evaluation status when evaluation detail is created
DELIMITER //
CREATE TRIGGER after_evaluation_detail_insert
AFTER INSERT ON evaluation_details
FOR EACH ROW
BEGIN
    DECLARE v_employee_id INT;
    
    SELECT employee_id INTO v_employee_id 
    FROM evaluations 
    WHERE id = NEW.evaluation_id;
    
    INSERT INTO evaluation_status (evaluation_id, employee_id, parameter_id, status)
    VALUES (NEW.evaluation_id, v_employee_id, NEW.parameter_id, 'completed')
    ON DUPLICATE KEY UPDATE 
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Trigger: Calculate weighted scores and overall score
DELIMITER //
CREATE TRIGGER after_evaluation_detail_update
AFTER UPDATE ON evaluation_details
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
    INNER JOIN evaluations e ON ed.evaluation_id = e.id
    WHERE ed.evaluation_id = NEW.evaluation_id
    AND pm.matrix_id = e.matrix_id;
    
    -- Update the evaluation with calculated scores
    UPDATE evaluations
    SET 
        weighted_score = total_weighted_score,
        overall_score = (total_weighted_score * 100) / NULLIF(total_weightage, 0)
    WHERE id = NEW.evaluation_id;
END //
DELIMITER ;

-- ============================================================================
-- 14. VIEWS
-- ============================================================================

-- View: Complete Employee Evaluation Status
CREATE OR REPLACE VIEW vw_employee_evaluation_status AS
SELECT
    e.id AS employee_id,
    e.organization_id,
    CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
    e.email AS employee_email,
    e.designation,
    e.team_id,
    t.team_name,
    d.id AS department_id,
    d.department_name,
    p.id AS parameter_id,
    p.parameter_name,
    p.category AS parameter_category,
    COALESCE(es.status, 'pending') AS evaluation_status,
    ed.score,
    ed.weighted_score,
    ed.comments AS parameter_comments,
    ev.overall_score,
    ev.weighted_score AS evaluation_weighted_score,
    ev.grade,
    ev.comments AS evaluation_comments,
    ev.evaluation_date,
    ev.evaluation_period_start,
    ev.evaluation_period_end,
    ev.status AS evaluation_overall_status,
    CONCAT(eval_user.name) AS evaluator_name,
    pm.matrix_name
FROM employees e
INNER JOIN organizations o ON e.organization_id = o.id
LEFT JOIN teams t ON e.team_id = t.id
LEFT JOIN departments d ON e.department_id = d.id
CROSS JOIN parameters p
LEFT JOIN evaluation_status es ON e.id = es.employee_id AND p.id = es.parameter_id
LEFT JOIN evaluations ev ON es.evaluation_id = ev.id
LEFT JOIN evaluation_details ed ON ev.id = ed.evaluation_id AND ed.parameter_id = p.id
LEFT JOIN users eval_user ON ev.evaluator_id = eval_user.id
LEFT JOIN performance_matrices pm ON ev.matrix_id = pm.id
WHERE 
    (p.is_global = 1 OR p.organization_id = e.organization_id)
    AND p.status = 'active'
    AND e.deleted_at IS NULL
    AND e.is_active = 1;

-- View: Organization Dashboard Statistics
CREATE OR REPLACE VIEW vw_organization_stats AS
SELECT
    o.id AS organization_id,
    o.organization_name,
    o.subscription_tier,
    o.subscription_status,
    COUNT(DISTINCT u.id) AS total_users,
    COUNT(DISTINCT e.id) AS total_employees,
    COUNT(DISTINCT d.id) AS total_departments,
    COUNT(DISTINCT t.id) AS total_teams,
    COUNT(DISTINCT CASE WHEN ev.status = 'completed' THEN ev.id END) AS completed_evaluations,
    COUNT(DISTINCT CASE WHEN ev.status = 'pending_review' THEN ev.id END) AS pending_evaluations,
    AVG(CASE WHEN ev.status = 'completed' THEN ev.overall_score END) AS avg_overall_score
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id AND u.deleted_at IS NULL AND u.is_active = 1
LEFT JOIN employees e ON o.id = e.organization_id AND e.deleted_at IS NULL AND e.is_active = 1
LEFT JOIN departments d ON o.id = d.organization_id AND d.deleted_at IS NULL AND d.is_active = 1
LEFT JOIN teams t ON o.id = t.organization_id AND t.deleted_at IS NULL AND t.is_active = 1
LEFT JOIN evaluations ev ON o.id = ev.organization_id AND ev.deleted_at IS NULL
WHERE o.deleted_at IS NULL AND o.is_active = 1
GROUP BY o.id;

-- ============================================================================
-- 15. STORED PROCEDURES
-- ============================================================================

-- Procedure: Get organization evaluation summary
DELIMITER //
CREATE PROCEDURE sp_get_org_evaluation_summary(IN org_id INT)
BEGIN
    SELECT 
        COUNT(DISTINCT e.id) AS total_evaluations,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) AS completed,
        COUNT(DISTINCT CASE WHEN e.status = 'draft' THEN e.id END) AS drafts,
        COUNT(DISTINCT CASE WHEN e.status = 'pending_review' THEN e.id END) AS pending_review,
        AVG(CASE WHEN e.status = 'completed' THEN e.overall_score END) AS avg_score,
        COUNT(DISTINCT e.employee_id) AS evaluated_employees,
        COUNT(DISTINCT emp.id) AS total_employees
    FROM evaluations e
    RIGHT JOIN employees emp ON e.employee_id = emp.id AND e.organization_id = emp.organization_id
    WHERE emp.organization_id = org_id
    AND emp.deleted_at IS NULL
    AND emp.is_active = 1;
END //
DELIMITER ;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 
    'SaaS-READY DATABASE CREATED SUCCESSFULLY!' AS status,
    '✓ Full multi-tenancy support' AS feature_1,
    '✓ Foreign key constraints' AS feature_2,
    '✓ Proper indexes for performance' AS feature_3,
    '✓ Soft deletes enabled' AS feature_4,
    '✓ Audit logging ready' AS feature_5,
    '✓ Subscription management' AS feature_6,
    '✓ Data isolation by organization' AS feature_7;