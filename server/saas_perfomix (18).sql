-- phpMyAdmin SQL Dump
-- version 5.0.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 09, 2026 at 07:47 AM
-- Server version: 5.7.31
-- PHP Version: 7.4.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `saas_perfomix`
--

DELIMITER $$
--
-- Procedures
--
DROP PROCEDURE IF EXISTS `sp_create_matrix_from_template`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_matrix_from_template` (IN `p_template_id` INT, IN `p_organization_id` INT, IN `p_created_by` INT, IN `p_matrix_name` VARCHAR(255), OUT `p_matrix_id` INT)  BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_total_weight INT;
    
    -- Check if template exists
    IF NOT EXISTS (SELECT 1 FROM matrix_templates WHERE id = p_template_id AND is_active = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Template not found or inactive';
    END IF;
    
    -- Calculate total weightage
    SELECT SUM(weightage) INTO v_total_weight
    FROM template_parameters
    WHERE template_id = p_template_id;
    
    -- Set status based on weightage
    SET v_status = IF(v_total_weight = 100, 'active', 'Draft');
    
    -- Create the performance matrix
    INSERT INTO performance_matrices (organization_id, matrix_name, created_by, status)
    VALUES (p_organization_id, p_matrix_name, p_created_by, v_status);
    
    SET p_matrix_id = LAST_INSERT_ID();
    
    -- Copy all parameters from template to matrix
    INSERT INTO parameter_matrices (matrix_id, parameter_id, weightage)
    SELECT p_matrix_id, parameter_id, weightage
    FROM template_parameters
    WHERE template_id = p_template_id;
    
    -- Increment usage count
    UPDATE matrix_templates
    SET usage_count = usage_count + 1
    WHERE id = p_template_id;
    
END$$

DROP PROCEDURE IF EXISTS `sp_get_org_evaluation_summary`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_org_evaluation_summary` (IN `org_id` INT)  BEGIN
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
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_id` int(11) NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cycle_team_assignments`
--

DROP TABLE IF EXISTS `cycle_team_assignments`;
CREATE TABLE IF NOT EXISTS `cycle_team_assignments` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `cycle_id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `matrix_id` int(11) NOT NULL,
  `evaluator_id` int(11) NOT NULL,
  `line_manager_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cycle_team` (`cycle_id`,`team_id`),
  KEY `fk_cta_team` (`team_id`),
  KEY `fk_cta_matrix` (`matrix_id`),
  KEY `fk_cta_manager` (`line_manager_id`),
  KEY `idx_evaluator` (`evaluator_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cycle_team_assignments`
--

INSERT INTO `cycle_team_assignments` (`id`, `cycle_id`, `team_id`, `matrix_id`, `evaluator_id`, `line_manager_id`, `created_at`) VALUES
(25, 15, 24, 10, 36, 36, '2026-03-03 16:21:38'),
(26, 15, 23, 10, 36, 36, '2026-03-03 16:21:49'),
(27, 15, 22, 10, 35, 35, '2026-03-03 16:21:56'),
(28, 15, 21, 10, 35, 35, '2026-03-03 16:22:01'),
(29, 15, 20, 10, 34, 34, '2026-03-03 16:22:10'),
(30, 15, 19, 10, 34, 34, '2026-03-03 16:22:13'),
(31, 15, 18, 10, 33, 33, '2026-03-03 16:22:22'),
(32, 15, 17, 10, 32, 32, '2026-03-03 16:22:29'),
(33, 15, 16, 10, 23, 23, '2026-03-03 16:22:36'),
(34, 15, 15, 10, 21, 21, '2026-03-03 16:22:43'),
(36, 16, 24, 10, 36, 36, '2026-03-06 00:29:39'),
(37, 17, 15, 10, 36, 36, '2026-03-06 02:29:36');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `department_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_department_id` int(11) DEFAULT NULL,
  `number_of_employees` int(11) DEFAULT '0',
  `department_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hod` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_dept_code_org` (`organization_id`,`department_code`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_parent` (`parent_department_id`),
  KEY `idx_active` (`is_active`,`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `organization_id`, `department_code`, `department_name`, `department_type`, `parent_department_id`, `number_of_employees`, `department_email`, `hod`, `department_description`, `is_active`, `deleted_at`, `created_at`, `updated_at`) VALUES
(7, 1, '211', 'Computer Science', 'Administrative', NULL, 20, 'CS@namal.edu.pkk', 'Ali Shahid', 'Computer science department inside Namal Universty', 1, NULL, '2025-12-11 05:09:27', '2026-01-08 17:25:11'),
(8, 1, '220', 'Math', 'Technical', NULL, 20, 'math@namal.edu.pk', 'DR ISRAR', 'Math department inside Namal Universty', 1, NULL, '2025-12-11 16:49:12', '2026-01-08 17:25:22'),
(9, 1, '229', 'ITSC', 'Technical', NULL, 10, 'itcs@namal.edu.pk', 'Adnan Malik', 'ITCS department inside Namal Universty', 1, NULL, '2026-01-05 16:22:36', '2026-01-08 17:25:56'),
(10, 1, '230', 'Electrical Engineering', 'Other', NULL, 10, 'EE@namal.edu.pk', 'Sami ud din', 'EE department inside Namal Universty', 1, NULL, '2026-01-05 16:26:26', '2026-01-08 17:29:59'),
(11, 1, '231', 'BBA', 'Other', NULL, 15, 'BBA@namal.edu.pk', 'MUHAMMAD AHMAD', 'BBA department inside Namal Universty', 1, NULL, '2026-01-05 16:34:01', '2026-01-08 17:29:44'),
(12, 1, '232', 'Artificial Intellignece', 'Technical', NULL, 12, 'AI@namal.edu.pk', 'Tasaduq Hussain ', 'AI Center inside Namal Universty', 1, NULL, '2026-01-05 16:39:01', '2026-01-12 19:51:41'),
(13, 1, '240', 'Lab enginner', 'Administrative', NULL, 0, 'lab@namal.edu.pk', 'Ali Zafar j', '', 0, '2026-01-08 17:31:32', '2026-01-08 17:31:11', '2026-01-08 17:31:32');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
CREATE TABLE IF NOT EXISTS `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `team_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('staff','line-manager','admin') COLLATE utf8mb4_unicode_ci DEFAULT 'staff',
  `joining_date` date DEFAULT NULL,
  `employment_status` enum('Full-time','Part-time','Contract','Intern','Probation') COLLATE utf8mb4_unicode_ci DEFAULT 'Full-time',
  `is_active` tinyint(1) DEFAULT '1',
  `profile_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marital_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `primary_contact_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanent_address` text COLLATE utf8mb4_unicode_ci,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_email_org` (`organization_id`,`email`),
  UNIQUE KEY `unique_employee_code_org` (`organization_id`,`employee_code`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_department` (`department_id`),
  KEY `idx_team` (`team_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_active` (`is_active`,`deleted_at`),
  KEY `idx_employment_status` (`employment_status`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `organization_id`, `department_id`, `team_id`, `user_id`, `first_name`, `last_name`, `email`, `user_password`, `employee_code`, `designation`, `role`, `joining_date`, `employment_status`, `is_active`, `profile_image`, `marital_status`, `date_of_birth`, `primary_contact_number`, `permanent_address`, `deleted_at`, `created_at`, `updated_at`) VALUES
(14, 1, 7, NULL, NULL, 'mudasir', 'khan', 'mudasir@namal.edu.pk', '$2b$10$ynR0VuUnowCJw4anAdexku1vQwdoEtG3LBojsic5H8IQW0tDQDX4y', '11', 'Tester', 'staff', '2025-12-16', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-16 13:07:33', '2026-01-06 02:34:32'),
(19, 1, 8, NULL, NULL, 'binayameen', 'khan', 'binayameen@namal.edu.pk', '$2b$10$z5XcMzdS8JVdgf3LtGwZr.T5JpgHRGge63cgi6oYSY4dpZwnte9Jy', '13', 'Teacher', 'staff', '2025-12-16', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-16 13:12:46', '2026-01-06 02:34:32'),
(21, 1, 8, NULL, NULL, 'Ashraf ', 'khan', 'Ashrafkhan@namal.edu.pk', '$2b$10$koC6DbMwaSfoPf2em8RJX.u0q/NU.aL/BAvPuJ7qdiYK52dAFy/Ga', '111', 'Evaluator', 'line-manager', '2025-12-30', NULL, 1, '/uploads/Profile_image-1768646049719-101013467.jpg', NULL, NULL, NULL, NULL, NULL, '2026-01-01 07:35:05', '2026-01-17 10:38:17'),
(23, 1, 7, NULL, NULL, 'jalal', 'rehman', 'jalal@namal.edu.pk', '$2b$10$H9E5hOr3AtYaVrX2O0oVq.sihjYEnhmjZFzwWGMfbFoB1/1fF/SC6', NULL, 'Evaluator', 'line-manager', '2026-01-21', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01 07:58:31', '2026-01-06 02:34:32'),
(24, 1, 7, NULL, NULL, 'Raqeeb', 'khan', 'Raqeeb@namal.edu.pk', '$2b$10$LGfT.qNHy3gwoPX9TsYjLOVlEygx/0DKGaydrl9.rNMGuaxekaLTO', NULL, 'Teacher', 'staff', '2026-01-02', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-02 02:16:12', '2026-01-17 10:42:18'),
(25, 1, 7, NULL, NULL, 'Shahid', 'khan', 'Sahhid@namal.edu.pk', '$2b$10$SWbwZ.KFwOj7p36/mxii2uTYjav.1bFtWn4VPXL70a9LiPsmxUNxC', NULL, 'Teacher', 'staff', '2026-01-02', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-02 02:17:15', '2026-01-06 02:34:32'),
(26, 1, 8, NULL, NULL, 'Amir', 'khan', 'Amir@namal.edu.pk', '$2b$10$1i3w9f.1DPuz6tDbeTAHZemDwz9eLCINyFysezRIo5JMwCj3XMq0C', NULL, 'Teacher', 'staff', '2025-12-31', NULL, 1, '/uploads/Profile_image-1768646213811-925034432.jpg', NULL, NULL, NULL, NULL, NULL, '2026-01-02 02:17:52', '2026-01-17 10:48:48'),
(27, 1, 8, NULL, NULL, 'Razik', 'khan', 'Raziq@namal.edu.pk', '$2b$10$3kHC7P0v3n0SKcKjWZRsuuC9P10KDU7o8J3FUDMZ1Y7wvEMA14lve', NULL, 'Teacher', 'staff', '2026-01-02', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-02 02:18:54', '2026-01-06 02:34:32'),
(28, 1, 8, NULL, NULL, 'Qasim', 'khan', 'Qasim@namal.edu.pk', '$2b$10$HNP5UwdmPFivcQMxaMIpterUd6wNCdM5su5UIR/NM4yW52TEf0Fqy', NULL, 'Teacher', 'staff', '2026-01-02', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-02 02:19:55', '2026-01-06 02:34:32'),
(29, 1, 8, NULL, NULL, 'Wasif', 'khan', 'Wasif@namal.edu.pk', '$2b$10$HNfgdlok.7iCwDQzjGlfNOMg79HhKj5pGcz5pTZEIyHDPRUwEKohm', NULL, 'Teacher', 'staff', '2026-01-02', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-02 02:21:25', '2026-01-06 02:34:32'),
(30, 1, 9, NULL, NULL, 'Jahangir', 'khan', 'jahangir@namal.edu.pk', '$2b$10$Phb4mNBAyqAVJKo6BYc/cOgct8KeGBPPIOI7zYNVr6WcxCup1Sk5a', NULL, 'IT HEAD', 'staff', '2026-01-05', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-05 18:03:53', '2026-01-06 02:34:32'),
(31, 1, 11, NULL, NULL, 'Majid', 'Basheer', 'majidbasheer@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', NULL, 'Teacher', 'staff', '2026-01-23', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:27:15', '2026-01-06 02:34:32'),
(32, 1, 7, NULL, NULL, 'Ahsan', 'Ali', 'ahsan.ali@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP201', 'Head of Mathematics', 'line-manager', '2024-08-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(33, 1, 8, NULL, NULL, 'Sajid', 'Mehmood', 'sajid.mehmood@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP202', 'Head of Computer Science', 'line-manager', '2024-08-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(34, 1, 9, NULL, NULL, 'Imran', 'Rashid', 'imran.rashid@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP203', 'IT Manager', 'line-manager', '2024-08-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(35, 1, 10, NULL, NULL, 'Farah', 'Yasmin', 'farah.yasmin@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP204', 'HR Manager', 'line-manager', '2024-08-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(36, 1, 11, NULL, NULL, 'Naveed', 'Akhtar', 'naveed.akhtar@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP205', 'Finance Manager', 'line-manager', '2024-08-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(37, 1, 7, NULL, NULL, 'Hassan', 'Raza', 'hassan.raza@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP206', 'Lecturer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(38, 1, 7, NULL, NULL, 'Usman', 'Khalid', 'usman.khalid@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP207', 'Lecturer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(39, 1, 7, NULL, NULL, 'Adnan', 'Butt', 'adnan.butt@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP208', 'Teaching Assistant', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(40, 1, 7, NULL, NULL, 'Faisal', 'Naeem', 'faisal.naeem@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP209', 'Instructor', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(41, 1, 8, NULL, NULL, 'Bilal', 'Ahmed', 'bilal.ahmed@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP210', 'Assistant Professor', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(42, 1, 8, NULL, NULL, 'Zain', 'Shah', 'zain.shah@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP211', 'Lab Engineer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(43, 1, 8, NULL, NULL, 'Nouman', 'Latif', 'nouman.latif@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP212', 'Teaching Assistant', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(44, 1, 8, NULL, NULL, 'Shahzaib', 'Hussain', 'shahzaib.hussain@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP213', 'Research Associate', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(45, 1, 9, NULL, NULL, 'Saad', 'Iqbal', 'saad.iqbal@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP214', 'System Administrator', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(46, 1, 9, NULL, NULL, 'Hamza', 'Nadeem', 'hamza.nadeem@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP215', 'Network Engineer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(47, 1, 9, NULL, NULL, 'Waqas', 'Siddique', 'waqas.siddique@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP216', 'IT Support Officer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(48, 1, 9, NULL, NULL, 'Ali', 'Haider', 'ali.haider@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP217', 'Database Assistant', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(49, 1, 10, NULL, NULL, 'Areeba', 'Khan', 'areeba.khan@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP218', 'HR Officer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(50, 1, 10, NULL, NULL, 'Maham', 'Saleem', 'maham.saleem@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP219', 'HR Assistant', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(51, 1, 10, NULL, NULL, 'Iqra', 'Nawaz', 'iqra.nawaz@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP220', 'Recruitment Officer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(52, 1, 11, NULL, NULL, 'Tariq', 'Javed', 'tariq.javed@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP221', 'Accounts Officer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(53, 1, 11, NULL, NULL, 'Sana', 'Rauf', 'sana.rauf@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP222', 'Accounts Assistant', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(54, 1, 11, NULL, NULL, 'Umar', 'Farooq', 'umar.farooq@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP223', 'Finance Clerk', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(55, 1, 12, NULL, NULL, 'Faizan', 'Malik', 'faizan.malik@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP224', 'Library Officer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(56, 1, 12, NULL, NULL, 'Khadija', 'Noor', 'khadija.noor@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP225', 'Library Assistant', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(57, 1, 12, NULL, NULL, 'Hira', 'Aslam', 'hira.aslam@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP226', 'Records Officer', 'staff', '2024-09-01', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:31:16', '2026-01-06 02:31:16'),
(58, 1, 7, NULL, NULL, 'Kamran', 'Yousaf', 'kamran.yousaf@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP227', 'Lecturer', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(59, 1, 7, NULL, NULL, 'Salman', 'Iqbal', 'salman.iqbal@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP228', 'Teaching Assistant', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(60, 1, 8, NULL, NULL, 'Arslan', 'Mahmood', 'arslan.mahmood@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP229', 'Lab Supervisor', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(61, 1, 8, NULL, NULL, 'Talha', 'Saeed', 'talha.saeed@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP230', 'Research Assistant', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(62, 1, 9, NULL, NULL, 'Sheryar', 'Khan', 'sheryar.khan@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP231', 'IT Support Engineer', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(63, 1, 9, NULL, NULL, 'Danish', 'Ali', 'danish.ali@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP232', 'System Technician', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(64, 1, 10, NULL, NULL, 'Anum', 'Riaz', 'anum.riaz@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP233', 'HR Coordinator', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(65, 1, 10, NULL, NULL, 'Mehwish', 'Akram', 'mehwish.akram@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP234', 'HR Records Officer', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(66, 1, 11, NULL, NULL, 'Hammad', 'Latif', 'hammad.latif@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP235', 'Accounts Clerk', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(67, 1, 11, NULL, NULL, 'Adeel', 'Rehman', 'adeel.rehman@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP236', 'Budget Assistant', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(68, 1, 12, NULL, NULL, 'Sidra', 'Khalil', 'sidra.khalil@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP237', 'Library Cataloguer', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(69, 1, 12, NULL, NULL, 'Usama', 'Sheikh', 'usama.sheikh@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP238', 'Library Technician', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(70, 1, 7, NULL, NULL, 'Noman', 'Aziz', 'noman.aziz@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP239', 'Instructor', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(71, 1, 8, NULL, NULL, 'Furqan', 'Haider', 'furqan.haider@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP240', 'Teaching Fellow', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(72, 1, 9, NULL, NULL, 'Irfan', 'Qureshi', 'irfan.qureshi@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP241', 'Network Assistant', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(73, 1, 10, NULL, NULL, 'Rabia', 'Shehzad', 'rabia.shehzad@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP242', 'HR Compliance Officer', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(74, 1, 11, NULL, NULL, 'Muneeb', 'Arif', 'muneeb.arif@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP243', 'Payroll Assistant', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(75, 1, 12, NULL, NULL, 'Aqsa', 'Tariq', 'aqsa.tariq@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP244', 'Archives Assistant', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(76, 1, 7, NULL, NULL, 'Rizwan', 'Asghar', 'rizwan.asghar@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP245', 'Senior Lecturer', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(77, 1, 8, NULL, NULL, 'Saima', 'Naseer', 'saima.naseer@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP246', 'Academic Coordinator', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(78, 1, 9, NULL, NULL, 'Bilal', 'Rauf', 'bilal.rauf@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP247', 'IT Operations Assistant', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03'),
(79, 1, 12, NULL, NULL, 'Maryam', 'Hafeez', 'maryam.hafeez@namal.edu.pk', '$2b$10$c/lc1/OkPWg7uevB4l9SYuSM2Ju3hHbCZFAND7IjniPfShtagimby', 'EMP248', 'Library Services Officer', 'staff', '2024-09-15', 'Full-time', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 02:33:03', '2026-01-06 02:33:03');

-- --------------------------------------------------------

--
-- Table structure for table `evaluations`
--

DROP TABLE IF EXISTS `evaluations`;
CREATE TABLE IF NOT EXISTS `evaluations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `cycle_id` int(11) NOT NULL,
  `cycle_team_assignment_id` int(11) DEFAULT NULL,
  `employee_id` int(11) NOT NULL,
  `evaluation_period_start` date NOT NULL,
  `evaluation_period_end` date NOT NULL,
  `evaluation_date` date NOT NULL,
  `overall_score` decimal(5,2) DEFAULT NULL,
  `weighted_score` decimal(5,2) DEFAULT NULL,
  `grade` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `strengths` text COLLATE utf8mb4_unicode_ci,
  `areas_for_improvement` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','pending_review','completed','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `rating_id` int(11) DEFAULT NULL,
  `rating_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cycle_team_employee` (`cycle_team_assignment_id`,`employee_id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_status` (`status`),
  KEY `idx_evaluation_date` (`evaluation_date`),
  KEY `idx_period` (`evaluation_period_start`,`evaluation_period_end`),
  KEY `fk_eval_approved_by` (`approved_by`),
  KEY `idx_eval_cta` (`cycle_team_assignment_id`),
  KEY `fk_evaluations_rating` (`rating_id`)
) ENGINE=InnoDB AUTO_INCREMENT=229 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `evaluations`
--

INSERT INTO `evaluations` (`id`, `organization_id`, `cycle_id`, `cycle_team_assignment_id`, `employee_id`, `evaluation_period_start`, `evaluation_period_end`, `evaluation_date`, `overall_score`, `weighted_score`, `grade`, `comments`, `strengths`, `areas_for_improvement`, `status`, `submitted_at`, `approved_at`, `approved_by`, `deleted_at`, `created_at`, `updated_at`, `rating_id`, `rating_name`) VALUES
(73, 1, 15, 25, 49, '2026-03-03', '2026-03-20', '2026-03-03', '92.00', '92.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:13:56', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(74, 1, 15, 25, 50, '2026-03-03', '2026-03-20', '2026-03-03', '99.00', '99.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:15:47', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(75, 1, 15, 25, 51, '2026-03-03', '2026-03-20', '2026-03-03', '95.80', '95.80', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:14:46', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(76, 1, 15, 25, 64, '2026-03-03', '2026-03-20', '2026-03-03', '84.00', '84.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:12:28', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(77, 1, 15, 25, 65, '2026-03-03', '2026-03-20', '2026-03-03', '90.00', '90.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:16:12', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(78, 1, 15, 25, 73, '2026-03-03', '2026-03-20', '2026-03-03', '83.00', '83.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:16:41', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(79, 1, 15, 26, 19, '2026-03-03', '2026-03-20', '2026-03-03', '88.00', '88.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:57:13', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(80, 1, 15, 26, 26, '2026-03-03', '2026-03-20', '2026-03-03', '72.00', '72.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:56:17', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 7, 'Good'),
(81, 1, 15, 26, 27, '2026-03-03', '2026-03-20', '2026-03-03', '81.00', '81.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:58:08', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(82, 1, 15, 26, 28, '2026-03-03', '2026-03-20', '2026-03-03', '90.00', '90.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:57:40', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(83, 1, 15, 26, 29, '2026-03-03', '2026-03-20', '2026-03-03', '87.00', '87.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:58:37', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(84, 1, 15, 26, 41, '2026-03-03', '2026-03-20', '2026-03-03', '91.00', '91.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:56:46', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(85, 1, 15, 26, 42, '2026-03-03', '2026-03-20', '2026-03-03', '94.00', '94.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:59:00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(86, 1, 15, 27, 43, '2026-03-03', '2026-03-20', '2026-03-03', '91.00', '91.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:31:42', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(87, 1, 15, 27, 44, '2026-03-03', '2026-03-20', '2026-03-03', '86.50', '86.50', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:32:38', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(88, 1, 15, 27, 60, '2026-03-03', '2026-03-20', '2026-03-03', '92.00', '92.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:30:47', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(89, 1, 15, 27, 61, '2026-03-03', '2026-03-20', '2026-03-03', '94.00', '94.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:34:15', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(90, 1, 15, 27, 71, '2026-03-03', '2026-03-20', '2026-03-03', '96.00', '96.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:31:13', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(91, 1, 15, 27, 77, '2026-03-03', '2026-03-20', '2026-03-03', '67.00', '67.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:32:08', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 10, 'Satisfactory'),
(92, 1, 15, 28, 14, '2026-03-03', '2026-03-20', '2026-03-03', '86.00', '86.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:35:28', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(93, 1, 15, 28, 24, '2026-03-03', '2026-03-20', '2026-03-03', '77.00', '77.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:35:56', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 7, 'Good'),
(94, 1, 15, 28, 25, '2026-03-03', '2026-03-20', '2026-03-03', '93.00', '93.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:36:24', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(95, 1, 15, 28, 37, '2026-03-03', '2026-03-20', '2026-03-03', '100.00', '100.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:35:00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(96, 1, 15, 28, 38, '2026-03-03', '2026-03-20', '2026-03-03', '97.00', '97.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:36:48', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(97, 1, 15, 29, 39, '2026-03-03', '2026-03-20', '2026-03-03', '90.00', '90.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 23:59:05', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(98, 1, 15, 29, 40, '2026-03-03', '2026-03-20', '2026-03-03', '91.00', '91.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 23:59:37', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(99, 1, 15, 29, 58, '2026-03-03', '2026-03-20', '2026-03-03', '94.50', '94.50', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:00:12', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(100, 1, 15, 29, 59, '2026-03-03', '2026-03-20', '2026-03-03', '96.00', '96.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:02:04', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(101, 1, 15, 29, 70, '2026-03-03', '2026-03-20', '2026-03-03', '88.00', '88.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:00:54', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(102, 1, 15, 29, 76, '2026-03-03', '2026-03-20', '2026-03-03', '85.00', '85.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:01:28', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(103, 1, 15, 30, 46, '2026-03-03', '2026-03-20', '2026-03-03', '93.00', '93.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:03:59', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(104, 1, 15, 30, 47, '2026-03-03', '2026-03-20', '2026-03-03', '92.00', '92.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:04:30', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(105, 1, 15, 30, 48, '2026-03-03', '2026-03-20', '2026-03-03', '95.50', '95.50', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:02:49', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(106, 1, 15, 31, 62, '2026-03-03', '2026-03-20', '2026-03-03', '94.00', '94.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:21:01', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(107, 1, 15, 31, 63, '2026-03-03', '2026-03-20', '2026-03-03', '96.00', '96.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:10:10', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(108, 1, 15, 31, 72, '2026-03-03', '2026-03-20', '2026-03-03', '94.00', '94.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:12:19', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(109, 1, 15, 31, 78, '2026-03-03', '2026-03-20', '2026-03-03', '92.00', '92.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:09:45', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(110, 1, 15, 32, 31, '2026-03-03', '2026-03-20', '2026-03-03', '88.00', '88.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:27:39', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(111, 1, 15, 32, 52, '2026-03-03', '2026-03-20', '2026-03-03', '89.00', '89.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:28:33', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(112, 1, 15, 32, 53, '2026-03-03', '2026-03-20', '2026-03-03', '90.00', '90.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-04 00:28:06', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(113, 1, 15, 33, 54, '2026-03-03', '2026-03-20', '2026-03-03', '89.00', '89.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:00:38', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(114, 1, 15, 33, 66, '2026-03-03', '2026-03-20', '2026-03-03', '93.00', '93.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:59:31', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(115, 1, 15, 33, 67, '2026-03-03', '2026-03-20', '2026-03-03', '90.00', '90.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:59:05', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(116, 1, 15, 33, 74, '2026-03-03', '2026-03-20', '2026-03-03', '88.50', '88.50', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 17:00:06', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(117, 1, 15, 34, 55, '2026-03-03', '2026-03-20', '2026-03-03', '86.00', '86.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:30:28', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(118, 1, 15, 34, 56, '2026-03-03', '2026-03-20', '2026-03-03', '78.00', '78.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:36:00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 7, 'Good'),
(119, 1, 15, 34, 57, '2026-03-03', '2026-03-20', '2026-03-03', '89.00', '89.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:35:23', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(120, 1, 15, 34, 68, '2026-03-03', '2026-03-20', '2026-03-03', '93.00', '93.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:40:00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(121, 1, 15, 34, 69, '2026-03-03', '2026-03-20', '2026-03-03', '85.00', '85.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:41:14', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(122, 1, 15, 34, 75, '2026-03-03', '2026-03-20', '2026-03-03', '90.00', '90.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:31:38', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 1, 'Excellent'),
(123, 1, 15, 34, 79, '2026-03-03', '2026-03-20', '2026-03-03', '87.00', '87.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-03 16:37:11', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-09 06:40:47', 4, 'Very Good'),
(221, 1, 17, 37, 55, '2026-03-06', '2026-03-12', '2026-03-06', '86.00', '86.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-07 06:30:16', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:40:47', 4, 'Very Good'),
(222, 1, 17, 37, 56, '2026-03-06', '2026-03-12', '2026-03-06', '89.00', '89.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-07 06:31:15', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:40:47', 4, 'Very Good'),
(223, 1, 17, 37, 57, '2026-03-06', '2026-03-12', '2026-03-06', '87.00', '87.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-07 06:30:44', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:40:47', 4, 'Very Good'),
(224, 1, 17, 37, 68, '2026-03-06', '2026-03-12', '2026-03-06', '89.00', '89.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-07 06:33:37', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:40:47', 4, 'Very Good'),
(225, 1, 17, 37, 69, '2026-03-06', '2026-03-12', '2026-03-06', '91.00', '91.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-07 06:34:02', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:40:47', 1, 'Excellent'),
(226, 1, 17, 37, 75, '2026-03-06', '2026-03-12', '2026-03-06', '52.60', '52.60', NULL, NULL, NULL, NULL, 'completed', '2026-03-07 06:29:44', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:40:47', 13, 'Needs Improvement'),
(227, 1, 17, 37, 79, '2026-03-06', '2026-03-12', '2026-03-06', '88.00', '88.00', NULL, NULL, NULL, NULL, 'completed', '2026-03-07 06:31:45', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:40:47', 4, 'Very Good'),
(228, 1, 17, NULL, 36, '2026-03-06', '2026-03-12', '2026-03-06', '95.00', NULL, NULL, 'Good', NULL, 'good', 'completed', NULL, NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-09 06:50:31', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_cycles`
--

DROP TABLE IF EXISTS `evaluation_cycles`;
CREATE TABLE IF NOT EXISTS `evaluation_cycles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `cycle_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('draft','active','closed','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `line_manager_matrix_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cycle_org` (`organization_id`),
  KEY `fk_cycle_creator` (`created_by`),
  KEY `fk_cycle_lm_matrix` (`line_manager_matrix_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `evaluation_cycles`
--

INSERT INTO `evaluation_cycles` (`id`, `organization_id`, `cycle_name`, `start_date`, `end_date`, `status`, `created_by`, `created_at`, `line_manager_matrix_id`) VALUES
(15, 1, 'Q1 2026 performnace Review', '2026-03-03', '2026-03-20', 'closed', 2, '2026-03-03 16:21:23', 11),
(17, 1, 'Q2 2026 Review Cycle', '2026-03-06', '2026-03-12', 'active', 2, '2026-03-06 02:29:05', 11);

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_details`
--

DROP TABLE IF EXISTS `evaluation_details`;
CREATE TABLE IF NOT EXISTS `evaluation_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `evaluation_id` int(11) NOT NULL,
  `parameter_id` int(11) NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `weighted_score` decimal(5,2) DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_eval_parameter` (`evaluation_id`,`parameter_id`),
  KEY `idx_evaluation` (`evaluation_id`),
  KEY `idx_parameter` (`parameter_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1944 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `evaluation_details`
--

INSERT INTO `evaluation_details` (`id`, `evaluation_id`, `parameter_id`, `score`, `weighted_score`, `comments`, `deleted_at`, `created_at`, `updated_at`) VALUES
(510, 78, 17, '50.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(511, 78, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(512, 78, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(513, 78, 102, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(514, 78, 105, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(515, 78, 108, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(516, 78, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(517, 78, 305, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(518, 78, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(519, 78, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(520, 77, 17, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(521, 77, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(522, 77, 101, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(523, 77, 102, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(524, 77, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(525, 77, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(526, 77, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(527, 77, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(528, 77, 310, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(529, 77, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(530, 76, 17, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(531, 76, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(532, 76, 101, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(533, 76, 102, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(534, 76, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(535, 76, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(536, 76, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(537, 76, 305, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(538, 76, 310, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(539, 76, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(540, 75, 17, '79.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(541, 75, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(542, 75, 101, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(543, 75, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(544, 75, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(545, 75, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(546, 75, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(547, 75, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(548, 75, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(549, 75, 316, '99.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(550, 74, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(551, 74, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(552, 74, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(553, 74, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(554, 74, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(555, 74, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(556, 74, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(557, 74, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(558, 74, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(559, 74, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(560, 73, 17, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(561, 73, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(562, 73, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(563, 73, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(564, 73, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(565, 73, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(566, 73, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(567, 73, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(568, 73, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(569, 73, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(570, 85, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(571, 85, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(572, 85, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(573, 85, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(574, 85, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(575, 85, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(576, 85, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(577, 85, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(578, 85, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(579, 85, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(580, 84, 17, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(581, 84, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(582, 84, 101, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(583, 84, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(584, 84, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(585, 84, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(586, 84, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(587, 84, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(588, 84, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(589, 84, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(590, 83, 17, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(591, 83, 18, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(592, 83, 101, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(593, 83, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(594, 83, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(595, 83, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(596, 83, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(597, 83, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(598, 83, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(599, 83, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(600, 82, 17, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(601, 82, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(602, 82, 101, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(603, 82, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(604, 82, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(605, 82, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(606, 82, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(607, 82, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(608, 82, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(609, 82, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(610, 81, 17, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(611, 81, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(612, 81, 101, '50.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(613, 81, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(614, 81, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(615, 81, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(616, 81, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(617, 81, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(618, 81, 310, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(619, 81, 316, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(620, 80, 17, '30.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(621, 80, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(622, 80, 101, '40.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(623, 80, 102, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(624, 80, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(625, 80, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(626, 80, 303, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(627, 80, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(628, 80, 310, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(629, 80, 316, '50.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(630, 79, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(631, 79, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(632, 79, 101, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(633, 79, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(634, 79, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(635, 79, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(636, 79, 303, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(637, 79, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(638, 79, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(639, 79, 316, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(640, 91, 17, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(641, 91, 18, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:07'),
(642, 91, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(643, 91, 102, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(644, 91, 105, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:07'),
(645, 91, 108, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:07'),
(646, 91, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(647, 91, 305, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:07'),
(648, 91, 310, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(649, 91, 316, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(650, 90, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(651, 90, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(652, 90, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(653, 90, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(654, 90, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(655, 90, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(656, 90, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(657, 90, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(658, 90, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(659, 90, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(660, 89, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(661, 89, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(662, 89, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(663, 89, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(664, 89, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(665, 89, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(666, 89, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(667, 89, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(668, 89, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(669, 89, 316, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(670, 88, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(671, 88, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(672, 88, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(673, 88, 102, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(674, 88, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(675, 88, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(676, 88, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(677, 88, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(678, 88, 310, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(679, 88, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(680, 87, 17, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(681, 87, 18, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(682, 87, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(683, 87, 102, '85.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(684, 87, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(685, 87, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(686, 87, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(687, 87, 305, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(688, 87, 310, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(689, 87, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(690, 86, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(691, 86, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(692, 86, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(693, 86, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(694, 86, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(695, 86, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(696, 86, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(697, 86, 305, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(698, 86, 310, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(699, 86, 316, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(700, 96, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(701, 96, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(702, 96, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(703, 96, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(704, 96, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(705, 96, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(706, 96, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(707, 96, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(708, 96, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(709, 96, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(710, 95, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(711, 95, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(712, 95, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(713, 95, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(714, 95, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(715, 95, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(716, 95, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(717, 95, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(718, 95, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(719, 95, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(720, 94, 17, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(721, 94, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(722, 94, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(723, 94, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(724, 94, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(725, 94, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(726, 94, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(727, 94, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(728, 94, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(729, 94, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(730, 93, 17, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(731, 93, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(732, 93, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(733, 93, 102, '50.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(734, 93, 105, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(735, 93, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(736, 93, 303, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(737, 93, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(738, 93, 310, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(739, 93, 316, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(740, 92, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(741, 92, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(742, 92, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(743, 92, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(744, 92, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(745, 92, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(746, 92, 303, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(747, 92, 305, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(748, 92, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(749, 92, 316, '50.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(750, 102, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(751, 102, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(752, 102, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(753, 102, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(754, 102, 105, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(755, 102, 108, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(756, 102, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(757, 102, 305, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(758, 102, 310, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(759, 102, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(760, 101, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(761, 101, 18, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(762, 101, 101, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(763, 101, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(764, 101, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(765, 101, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(766, 101, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(767, 101, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(768, 101, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(769, 101, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(770, 100, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(771, 100, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(772, 100, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(773, 100, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(774, 100, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(775, 100, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(776, 100, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(777, 100, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(778, 100, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(779, 100, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(780, 99, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(781, 99, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(782, 99, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(783, 99, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(784, 99, 105, '75.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(785, 99, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(786, 99, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(787, 99, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(788, 99, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(789, 99, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(790, 98, 17, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(791, 98, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(792, 98, 101, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(793, 98, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(794, 98, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(795, 98, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(796, 98, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(797, 98, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(798, 98, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(799, 98, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(800, 97, 17, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(801, 97, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(802, 97, 101, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(803, 97, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(804, 97, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(805, 97, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(806, 97, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(807, 97, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(808, 97, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(809, 97, 316, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(810, 105, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(811, 105, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(812, 105, 101, '85.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(813, 105, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(814, 105, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(815, 105, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(816, 105, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(817, 105, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(818, 105, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(819, 105, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(820, 104, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(821, 104, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(822, 104, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(823, 104, 102, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(824, 104, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(825, 104, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(826, 104, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(827, 104, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(828, 104, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(829, 104, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(830, 103, 17, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(831, 103, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(832, 103, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(833, 103, 102, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(834, 103, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(835, 103, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(836, 103, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(837, 103, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(838, 103, 310, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(839, 103, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(840, 109, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(841, 109, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(842, 109, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(843, 109, 102, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(844, 109, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(845, 109, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(846, 109, 303, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(847, 109, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(848, 109, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(849, 109, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(850, 108, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(851, 108, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(852, 108, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(853, 108, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(854, 108, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(855, 108, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(856, 108, 303, '95.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(857, 108, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(858, 108, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(859, 108, 316, '85.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(860, 107, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(861, 107, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(862, 107, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(863, 107, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(864, 107, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(865, 107, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(866, 107, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(867, 107, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(868, 107, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(869, 107, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(870, 106, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(871, 106, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(872, 106, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(873, 106, 102, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(874, 106, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(875, 106, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(876, 106, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(877, 106, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(878, 106, 310, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(879, 106, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(880, 112, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(881, 112, 18, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(882, 112, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(883, 112, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(884, 112, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(885, 112, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(886, 112, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(887, 112, 305, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(888, 112, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(889, 112, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(890, 111, 17, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(891, 111, 18, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(892, 111, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(893, 111, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(894, 111, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(895, 111, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(896, 111, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(897, 111, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(898, 111, 310, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(899, 111, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(900, 110, 17, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(901, 110, 18, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(902, 110, 101, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(903, 110, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(904, 110, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(905, 110, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(906, 110, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(907, 110, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(908, 110, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(909, 110, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(910, 116, 17, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(911, 116, 18, '95.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(912, 116, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(913, 116, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(914, 116, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(915, 116, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(916, 116, 303, '20.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(917, 116, 305, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(918, 116, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(919, 116, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(920, 115, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(921, 115, 18, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(922, 115, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(923, 115, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(924, 115, 105, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(925, 115, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(926, 115, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(927, 115, 305, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(928, 115, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(929, 115, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(930, 114, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(931, 114, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(932, 114, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(933, 114, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(934, 114, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(935, 114, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(936, 114, 303, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(937, 114, 305, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(938, 114, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(939, 114, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(940, 113, 17, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(941, 113, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(942, 113, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(943, 113, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(944, 113, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(945, 113, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(946, 113, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(947, 113, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(948, 113, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(949, 113, 316, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(950, 123, 17, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(951, 123, 18, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(952, 123, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(953, 123, 102, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(954, 123, 105, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(955, 123, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(956, 123, 303, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(957, 123, 305, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(958, 123, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(959, 123, 316, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(960, 122, 17, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(961, 122, 18, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(962, 122, 101, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(963, 122, 102, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(964, 122, 105, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(965, 122, 108, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(966, 122, 303, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(967, 122, 305, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(968, 122, 310, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(969, 122, 316, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(970, 121, 17, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(971, 121, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(972, 121, 101, '30.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(973, 121, 102, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(974, 121, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(975, 121, 108, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(976, 121, 303, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(977, 121, 305, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(978, 121, 310, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(979, 121, 316, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(980, 120, 17, '80.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(981, 120, 18, '100.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(982, 120, 101, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(983, 120, 102, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(984, 120, 105, '90.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(985, 120, 108, '100.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(986, 120, 303, '80.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(987, 120, 305, '100.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(988, 120, 310, '100.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(989, 120, 316, '100.00', NULL, 'good', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(990, 119, 17, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(991, 119, 18, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(992, 119, 101, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(993, 119, 102, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(994, 119, 105, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(995, 119, 108, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(996, 119, 303, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(997, 119, 305, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(998, 119, 310, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(999, 119, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1000, 118, 17, '60.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1001, 118, 18, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1002, 118, 101, '100.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1003, 118, 102, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1004, 118, 105, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1005, 118, 108, '50.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1006, 118, 303, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1007, 118, 305, '80.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1008, 118, 310, '70.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1009, 118, 316, '90.00', NULL, NULL, NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1010, 117, 17, '100.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1011, 117, 18, '100.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1012, 117, 101, '90.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1013, 117, 102, '70.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1014, 117, 105, '80.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1015, 117, 108, '90.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1016, 117, 303, '90.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1017, 117, 305, '90.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1018, 117, 310, '60.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1019, 117, 316, '90.00', NULL, 'good improve it ', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1800, 227, 17, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1801, 227, 18, '70.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1802, 227, 101, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1803, 227, 102, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1804, 227, 105, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1805, 227, 108, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1806, 227, 303, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1807, 227, 305, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1808, 227, 310, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1809, 227, 316, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1810, 226, 17, '89.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1811, 226, 18, '67.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1812, 226, 101, '77.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1813, 226, 102, '56.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1814, 226, 105, '34.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1815, 226, 108, '47.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1816, 226, 303, '23.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1817, 226, 305, '32.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1818, 226, 310, '34.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1819, 226, 316, '67.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1820, 225, 17, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1821, 225, 18, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1822, 225, 101, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1823, 225, 102, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1824, 225, 105, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1825, 225, 108, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1826, 225, 303, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1827, 225, 305, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1828, 225, 310, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1829, 225, 316, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1830, 224, 17, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1831, 224, 18, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1832, 224, 101, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1833, 224, 102, '70.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1834, 224, 105, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1835, 224, 108, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1836, 224, 303, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1837, 224, 305, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1838, 224, 310, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1839, 224, 316, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1840, 223, 17, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1841, 223, 18, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1842, 223, 101, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1843, 223, 102, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1844, 223, 105, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1845, 223, 108, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1846, 223, 303, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1847, 223, 305, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1848, 223, 310, '70.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1849, 223, 316, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1850, 222, 17, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1851, 222, 18, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1852, 222, 101, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1853, 222, 102, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1854, 222, 105, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15');
INSERT INTO `evaluation_details` (`id`, `evaluation_id`, `parameter_id`, `score`, `weighted_score`, `comments`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1855, 222, 108, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1856, 222, 303, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1857, 222, 305, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1858, 222, 310, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1859, 222, 316, '70.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1860, 221, 17, '70.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1861, 221, 18, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1862, 221, 101, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1863, 221, 102, '80.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1864, 221, 105, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1865, 221, 108, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1866, 221, 303, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1867, 221, 305, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1868, 221, 310, '70.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1869, 221, 316, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1870, 228, 101, '100.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 13:57:01'),
(1871, 228, 102, '90.00', NULL, NULL, NULL, '2026-03-06 03:04:58', '2026-03-07 13:57:01');

--
-- Triggers `evaluation_details`
--
DROP TRIGGER IF EXISTS `after_evaluation_detail_insert`;
DELIMITER $$
CREATE TRIGGER `after_evaluation_detail_insert` AFTER INSERT ON `evaluation_details` FOR EACH ROW BEGIN
    DECLARE v_employee_id INT;
    
    SELECT employee_id INTO v_employee_id
    FROM evaluations
    WHERE id = NEW.evaluation_id;
    
    -- Only mark as 'completed' if the evaluator actually entered a score > 0
    IF NEW.score IS NOT NULL AND NEW.score > 0 THEN
        INSERT INTO evaluation_status 
            (evaluation_id, employee_id, parameter_id, status)
        VALUES 
            (NEW.evaluation_id, v_employee_id, NEW.parameter_id, 'completed')
        ON DUPLICATE KEY UPDATE 
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP;
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `after_evaluation_detail_update`;
DELIMITER $$
CREATE TRIGGER `after_evaluation_detail_update` AFTER UPDATE ON `evaluation_details` FOR EACH ROW BEGIN
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
    INNER JOIN cycle_team_assignments cta ON ev.cycle_team_assignment_id = cta.id
    WHERE ed.evaluation_id = NEW.evaluation_id
    AND pm.matrix_id = cta.matrix_id;
    
    -- Update the evaluation with calculated scores
    UPDATE evaluations
    SET 
        weighted_score = total_weighted_score,
        overall_score = (total_weighted_score * 100) / NULLIF(total_weightage, 0)
    WHERE id = NEW.evaluation_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_status`
--

DROP TABLE IF EXISTS `evaluation_status`;
CREATE TABLE IF NOT EXISTS `evaluation_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `evaluation_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `parameter_id` int(11) NOT NULL,
  `status` enum('pending','in_progress','completed','skipped') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_eval_emp_param` (`evaluation_id`,`employee_id`,`parameter_id`),
  UNIQUE KEY `unique_eval_param` (`evaluation_id`,`employee_id`,`parameter_id`),
  KEY `idx_evaluation` (`evaluation_id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_parameter` (`parameter_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1371 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `evaluation_status`
--

INSERT INTO `evaluation_status` (`id`, `evaluation_id`, `employee_id`, `parameter_id`, `status`, `deleted_at`, `created_at`, `updated_at`) VALUES
(520, 78, 49, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(521, 78, 49, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(522, 78, 49, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(523, 78, 49, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(524, 78, 49, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(525, 78, 49, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(526, 78, 49, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(527, 78, 49, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(528, 78, 49, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(529, 78, 49, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:41'),
(530, 77, 50, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(531, 77, 50, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(532, 77, 50, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(533, 77, 50, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(534, 77, 50, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(535, 77, 50, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(536, 77, 50, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(537, 77, 50, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(538, 77, 50, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(539, 77, 50, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:16:12'),
(540, 76, 51, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(541, 76, 51, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(542, 76, 51, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(543, 76, 51, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(544, 76, 51, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(545, 76, 51, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(546, 76, 51, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(547, 76, 51, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(548, 76, 51, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(549, 76, 51, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:12:28'),
(550, 75, 64, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(551, 75, 64, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(552, 75, 64, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(553, 75, 64, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(554, 75, 64, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(555, 75, 64, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(556, 75, 64, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(557, 75, 64, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(558, 75, 64, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(559, 75, 64, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:14:46'),
(560, 74, 65, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(561, 74, 65, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(562, 74, 65, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(563, 74, 65, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(564, 74, 65, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(565, 74, 65, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(566, 74, 65, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(567, 74, 65, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(568, 74, 65, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(569, 74, 65, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:15:47'),
(570, 73, 73, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(571, 73, 73, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(572, 73, 73, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(573, 73, 73, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(574, 73, 73, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(575, 73, 73, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(576, 73, 73, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(577, 73, 73, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(578, 73, 73, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(579, 73, 73, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:13:56'),
(580, 85, 19, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(581, 85, 19, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(582, 85, 19, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(583, 85, 19, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(584, 85, 19, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(585, 85, 19, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(586, 85, 19, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(587, 85, 19, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(588, 85, 19, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(589, 85, 19, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:59:00'),
(590, 84, 26, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(591, 84, 26, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(592, 84, 26, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(593, 84, 26, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(594, 84, 26, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(595, 84, 26, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(596, 84, 26, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(597, 84, 26, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(598, 84, 26, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(599, 84, 26, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:46'),
(600, 83, 27, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(601, 83, 27, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(602, 83, 27, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(603, 83, 27, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(604, 83, 27, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(605, 83, 27, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(606, 83, 27, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(607, 83, 27, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(608, 83, 27, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(609, 83, 27, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:37'),
(610, 82, 28, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(611, 82, 28, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(612, 82, 28, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(613, 82, 28, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(614, 82, 28, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(615, 82, 28, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(616, 82, 28, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(617, 82, 28, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(618, 82, 28, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(619, 82, 28, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:40'),
(620, 81, 29, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(621, 81, 29, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(622, 81, 29, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(623, 81, 29, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(624, 81, 29, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(625, 81, 29, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(626, 81, 29, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(627, 81, 29, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(628, 81, 29, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(629, 81, 29, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:58:08'),
(630, 80, 41, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(631, 80, 41, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(632, 80, 41, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(633, 80, 41, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(634, 80, 41, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(635, 80, 41, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(636, 80, 41, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(637, 80, 41, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(638, 80, 41, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(639, 80, 41, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:56:16'),
(640, 79, 42, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(641, 79, 42, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(642, 79, 42, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(643, 79, 42, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(644, 79, 42, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(645, 79, 42, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(646, 79, 42, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(647, 79, 42, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(648, 79, 42, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(649, 79, 42, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:57:13'),
(650, 91, 43, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(651, 91, 43, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(652, 91, 43, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(653, 91, 43, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(654, 91, 43, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:07'),
(655, 91, 43, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:07'),
(656, 91, 43, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(657, 91, 43, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:07'),
(658, 91, 43, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(659, 91, 43, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:08'),
(660, 90, 44, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(661, 90, 44, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(662, 90, 44, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(663, 90, 44, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(664, 90, 44, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(665, 90, 44, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(666, 90, 44, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(667, 90, 44, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(668, 90, 44, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(669, 90, 44, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:13'),
(670, 89, 60, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(671, 89, 60, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(672, 89, 60, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(673, 89, 60, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(674, 89, 60, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(675, 89, 60, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(676, 89, 60, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(677, 89, 60, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(678, 89, 60, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(679, 89, 60, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:34:15'),
(680, 88, 61, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(681, 88, 61, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(682, 88, 61, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(683, 88, 61, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(684, 88, 61, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(685, 88, 61, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(686, 88, 61, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(687, 88, 61, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(688, 88, 61, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(689, 88, 61, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:30:47'),
(690, 87, 71, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(691, 87, 71, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(692, 87, 71, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(693, 87, 71, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(694, 87, 71, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(695, 87, 71, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(696, 87, 71, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(697, 87, 71, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(698, 87, 71, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(699, 87, 71, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:32:38'),
(700, 86, 77, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(701, 86, 77, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(702, 86, 77, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(703, 86, 77, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(704, 86, 77, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(705, 86, 77, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(706, 86, 77, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(707, 86, 77, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(708, 86, 77, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(709, 86, 77, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:31:42'),
(710, 96, 14, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(711, 96, 14, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(712, 96, 14, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(713, 96, 14, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(714, 96, 14, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(715, 96, 14, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(716, 96, 14, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(717, 96, 14, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(718, 96, 14, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(719, 96, 14, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:48'),
(720, 95, 24, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(721, 95, 24, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(722, 95, 24, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(723, 95, 24, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(724, 95, 24, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(725, 95, 24, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(726, 95, 24, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(727, 95, 24, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(728, 95, 24, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(729, 95, 24, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:00'),
(730, 94, 25, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(731, 94, 25, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(732, 94, 25, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(733, 94, 25, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(734, 94, 25, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(735, 94, 25, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(736, 94, 25, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(737, 94, 25, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(738, 94, 25, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(739, 94, 25, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:36:24'),
(740, 93, 37, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(741, 93, 37, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(742, 93, 37, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(743, 93, 37, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(744, 93, 37, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(745, 93, 37, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(746, 93, 37, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(747, 93, 37, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(748, 93, 37, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(749, 93, 37, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:56'),
(750, 92, 38, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(751, 92, 38, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(752, 92, 38, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(753, 92, 38, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(754, 92, 38, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(755, 92, 38, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(756, 92, 38, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(757, 92, 38, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(758, 92, 38, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(759, 92, 38, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:35:28'),
(760, 102, 39, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(761, 102, 39, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(762, 102, 39, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(763, 102, 39, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(764, 102, 39, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(765, 102, 39, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(766, 102, 39, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(767, 102, 39, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(768, 102, 39, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(769, 102, 39, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:01:28'),
(770, 101, 40, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(771, 101, 40, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(772, 101, 40, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(773, 101, 40, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(774, 101, 40, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(775, 101, 40, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(776, 101, 40, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(777, 101, 40, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(778, 101, 40, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(779, 101, 40, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:54'),
(780, 100, 58, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(781, 100, 58, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(782, 100, 58, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(783, 100, 58, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(784, 100, 58, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(785, 100, 58, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(786, 100, 58, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(787, 100, 58, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(788, 100, 58, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(789, 100, 58, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:04'),
(790, 99, 59, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(791, 99, 59, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(792, 99, 59, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(793, 99, 59, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(794, 99, 59, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(795, 99, 59, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(796, 99, 59, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(797, 99, 59, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(798, 99, 59, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(799, 99, 59, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:00:12'),
(800, 98, 70, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(801, 98, 70, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(802, 98, 70, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(803, 98, 70, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(804, 98, 70, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(805, 98, 70, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(806, 98, 70, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(807, 98, 70, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(808, 98, 70, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(809, 98, 70, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:37'),
(810, 97, 76, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(811, 97, 76, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(812, 97, 76, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(813, 97, 76, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(814, 97, 76, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(815, 97, 76, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(816, 97, 76, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(817, 97, 76, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(818, 97, 76, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(819, 97, 76, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 23:59:05'),
(820, 105, 46, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(821, 105, 46, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(822, 105, 46, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(823, 105, 46, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(824, 105, 46, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(825, 105, 46, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(826, 105, 46, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(827, 105, 46, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(828, 105, 46, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(829, 105, 46, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:02:49'),
(830, 104, 47, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(831, 104, 47, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(832, 104, 47, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(833, 104, 47, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(834, 104, 47, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(835, 104, 47, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(836, 104, 47, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(837, 104, 47, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(838, 104, 47, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(839, 104, 47, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:04:30'),
(840, 103, 48, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(841, 103, 48, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(842, 103, 48, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(843, 103, 48, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(844, 103, 48, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(845, 103, 48, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(846, 103, 48, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(847, 103, 48, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(848, 103, 48, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(849, 103, 48, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:03:59'),
(850, 109, 62, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(851, 109, 62, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(852, 109, 62, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(853, 109, 62, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(854, 109, 62, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(855, 109, 62, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(856, 109, 62, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(857, 109, 62, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(858, 109, 62, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(859, 109, 62, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:09:45'),
(860, 108, 63, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(861, 108, 63, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(862, 108, 63, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(863, 108, 63, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(864, 108, 63, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(865, 108, 63, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(866, 108, 63, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(867, 108, 63, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(868, 108, 63, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(869, 108, 63, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:12:19'),
(870, 107, 72, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(871, 107, 72, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(872, 107, 72, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(873, 107, 72, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(874, 107, 72, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(875, 107, 72, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(876, 107, 72, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(877, 107, 72, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(878, 107, 72, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(879, 107, 72, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:10:10'),
(880, 106, 78, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(881, 106, 78, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(882, 106, 78, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(883, 106, 78, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(884, 106, 78, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(885, 106, 78, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(886, 106, 78, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(887, 106, 78, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(888, 106, 78, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(889, 106, 78, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:21:01'),
(890, 112, 31, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(891, 112, 31, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(892, 112, 31, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(893, 112, 31, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(894, 112, 31, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(895, 112, 31, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(896, 112, 31, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(897, 112, 31, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(898, 112, 31, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(899, 112, 31, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:06'),
(900, 111, 52, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(901, 111, 52, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(902, 111, 52, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(903, 111, 52, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(904, 111, 52, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(905, 111, 52, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(906, 111, 52, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(907, 111, 52, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(908, 111, 52, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(909, 111, 52, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:28:33'),
(910, 110, 53, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(911, 110, 53, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(912, 110, 53, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(913, 110, 53, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(914, 110, 53, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(915, 110, 53, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(916, 110, 53, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(917, 110, 53, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(918, 110, 53, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(919, 110, 53, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-04 00:27:39'),
(920, 116, 54, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(921, 116, 54, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(922, 116, 54, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(923, 116, 54, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(924, 116, 54, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(925, 116, 54, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(926, 116, 54, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(927, 116, 54, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(928, 116, 54, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(929, 116, 54, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:06'),
(930, 115, 66, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(931, 115, 66, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(932, 115, 66, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(933, 115, 66, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(934, 115, 66, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(935, 115, 66, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(936, 115, 66, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(937, 115, 66, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(938, 115, 66, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(939, 115, 66, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:05'),
(940, 114, 67, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(941, 114, 67, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(942, 114, 67, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(943, 114, 67, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(944, 114, 67, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(945, 114, 67, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(946, 114, 67, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(947, 114, 67, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(948, 114, 67, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(949, 114, 67, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:59:31'),
(950, 113, 74, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(951, 113, 74, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(952, 113, 74, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(953, 113, 74, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(954, 113, 74, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(955, 113, 74, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(956, 113, 74, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(957, 113, 74, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(958, 113, 74, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(959, 113, 74, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 17:00:38'),
(960, 123, 55, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(961, 123, 55, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(962, 123, 55, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(963, 123, 55, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(964, 123, 55, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(965, 123, 55, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(966, 123, 55, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(967, 123, 55, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(968, 123, 55, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(969, 123, 55, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:37:11'),
(970, 122, 56, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(971, 122, 56, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(972, 122, 56, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(973, 122, 56, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(974, 122, 56, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(975, 122, 56, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(976, 122, 56, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(977, 122, 56, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(978, 122, 56, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(979, 122, 56, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:31:38'),
(980, 121, 57, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(981, 121, 57, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(982, 121, 57, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(983, 121, 57, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(984, 121, 57, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(985, 121, 57, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(986, 121, 57, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(987, 121, 57, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(988, 121, 57, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(989, 121, 57, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:41:14'),
(990, 120, 68, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(991, 120, 68, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(992, 120, 68, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(993, 120, 68, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(994, 120, 68, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(995, 120, 68, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(996, 120, 68, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(997, 120, 68, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(998, 120, 68, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(999, 120, 68, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:40:00'),
(1000, 119, 69, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1001, 119, 69, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1002, 119, 69, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1003, 119, 69, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1004, 119, 69, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1005, 119, 69, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1006, 119, 69, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1007, 119, 69, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1008, 119, 69, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1009, 119, 69, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:35:23'),
(1010, 118, 75, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1011, 118, 75, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1012, 118, 75, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1013, 118, 75, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1014, 118, 75, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1015, 118, 75, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1016, 118, 75, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1017, 118, 75, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1018, 118, 75, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1019, 118, 75, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:36:00'),
(1020, 117, 79, 17, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1021, 117, 79, 18, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1022, 117, 79, 101, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1023, 117, 79, 102, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1024, 117, 79, 105, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1025, 117, 79, 108, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1026, 117, 79, 303, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1027, 117, 79, 305, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1028, 117, 79, 310, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1029, 117, 79, 316, 'completed', NULL, '2026-03-03 16:22:51', '2026-03-03 16:30:28'),
(1300, 227, 55, 17, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1301, 227, 55, 18, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1302, 227, 55, 101, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1303, 227, 55, 102, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1304, 227, 55, 105, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1305, 227, 55, 108, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1306, 227, 55, 303, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1307, 227, 55, 305, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1308, 227, 55, 310, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1309, 227, 55, 316, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:45'),
(1310, 226, 56, 17, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1311, 226, 56, 18, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1312, 226, 56, 101, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1313, 226, 56, 102, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1314, 226, 56, 105, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1315, 226, 56, 108, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1316, 226, 56, 303, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1317, 226, 56, 305, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1318, 226, 56, 310, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1319, 226, 56, 316, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:29:44'),
(1320, 225, 57, 17, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1321, 225, 57, 18, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1322, 225, 57, 101, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1323, 225, 57, 102, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1324, 225, 57, 105, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1325, 225, 57, 108, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1326, 225, 57, 303, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1327, 225, 57, 305, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1328, 225, 57, 310, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1329, 225, 57, 316, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:34:02'),
(1330, 224, 68, 17, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1331, 224, 68, 18, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1332, 224, 68, 101, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1333, 224, 68, 102, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1334, 224, 68, 105, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1335, 224, 68, 108, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1336, 224, 68, 303, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1337, 224, 68, 305, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1338, 224, 68, 310, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1339, 224, 68, 316, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:33:37'),
(1340, 223, 69, 17, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1341, 223, 69, 18, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1342, 223, 69, 101, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1343, 223, 69, 102, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1344, 223, 69, 105, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1345, 223, 69, 108, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1346, 223, 69, 303, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1347, 223, 69, 305, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1348, 223, 69, 310, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1349, 223, 69, 316, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:44'),
(1350, 222, 75, 17, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1351, 222, 75, 18, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1352, 222, 75, 101, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1353, 222, 75, 102, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1354, 222, 75, 105, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1355, 222, 75, 108, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1356, 222, 75, 303, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1357, 222, 75, 305, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1358, 222, 75, 310, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1359, 222, 75, 316, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:31:15'),
(1360, 221, 79, 17, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1361, 221, 79, 18, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1362, 221, 79, 101, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1363, 221, 79, 102, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1364, 221, 79, 105, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1365, 221, 79, 108, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1366, 221, 79, 303, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1367, 221, 79, 305, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1368, 221, 79, 310, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1369, 221, 79, 316, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 06:30:16'),
(1370, 228, 0, 0, 'completed', NULL, '2026-03-06 03:04:58', '2026-03-07 13:57:01');

-- --------------------------------------------------------

--
-- Table structure for table `matrix_templates`
--

DROP TABLE IF EXISTS `matrix_templates`;
CREATE TABLE IF NOT EXISTS `matrix_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `industry_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Education, IT, Healthcare, etc.',
  `organization_size` enum('1-10','11-50','51-200','201-500','501-1000','1000+') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_global` tinyint(1) DEFAULT '1' COMMENT 'Available to all organizations',
  `created_by` int(11) DEFAULT NULL COMMENT 'Super admin who created it',
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `usage_count` int(11) DEFAULT '0' COMMENT 'How many times used',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_industry` (`industry_type`),
  KEY `idx_global` (`is_global`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `matrix_templates`
--

INSERT INTO `matrix_templates` (`id`, `template_name`, `description`, `industry_type`, `organization_size`, `is_global`, `created_by`, `icon`, `is_active`, `usage_count`, `created_at`, `updated_at`) VALUES
(1, 'University Faculty Performance Review', 'Comprehensive evaluation template for university professors and lecturers covering teaching, research, and service', 'Education', NULL, 1, 1, '🎓', 0, 1, '2026-01-05 13:38:01', '2026-01-06 14:03:04'),
(2, 'Software Engineer Performance Review', 'Complete evaluation framework for software developers covering technical skills, delivery, and collaboration', 'Information Technology', NULL, 1, 1, '💻', 0, 0, '2026-01-05 13:38:01', '2026-01-06 14:03:04'),
(10, 'University Faculty Performance Review', 'Comprehensive evaluation for academic staff.', 'Education', NULL, 1, NULL, '🎓', 1, 0, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(11, 'Software Engineer Performance Review', 'Standard evaluation for software developers.', 'Information Technology', NULL, 1, NULL, '💻', 1, 0, '2026-01-06 13:49:53', '2026-01-06 13:49:53');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL COMMENT 'Employee ID who receives the notification',
  `sender_id` int(11) DEFAULT NULL COMMENT 'Employee ID who triggered the notification (optional)',
  `notification_type` enum('team_assignment','evaluation_submitted','manager_completion','admin_reminder','deadline_reminder','cycle_activation','cycle_closure') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL COMMENT 'Additional data like cycle_id, team_id, evaluation_id, etc.',
  `action_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Link to relevant page',
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipient` (`recipient_id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_type` (`notification_type`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_recipient_read` (`recipient_id`,`is_read`),
  KEY `idx_notification_lookup` (`recipient_id`,`is_read`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=465 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `organization_id`, `recipient_id`, `sender_id`, `notification_type`, `title`, `message`, `metadata`, `action_url`, `is_read`, `read_at`, `priority`, `created_at`, `updated_at`) VALUES
(206, 1, 23, 2, 'team_assignment', 'New Team Assigned: Q4 2026 Review', 'You have been assigned to evaluate Team BAN (4 employees) for the Q4 2026 Review cycle. Deadline: 2/26/2026', '{\"cycle_id\": 13, \"deadline\": \"2026-02-25T19:00:00.000Z\", \"team_name\": \"Team BAN\", \"cycle_name\": \"Q4 2026 Review\", \"employee_count\": 4}', '/performance-evaluation', 1, '2026-02-17 07:53:12', 'high', '2026-02-10 14:44:27', '2026-02-17 07:53:12'),
(207, 1, 21, 2, 'team_assignment', 'New Team Assigned: Q4 2026 Review', 'You have been assigned to evaluate TEAM DDD (4 employees) for the Q4 2026 Review cycle. Deadline: 2/26/2026', '{\"cycle_id\": 13, \"deadline\": \"2026-02-25T19:00:00.000Z\", \"team_name\": \"TEAM DDD\", \"cycle_name\": \"Q4 2026 Review\", \"employee_count\": 4}', '/performance-evaluation', 1, '2026-02-17 07:52:02', 'high', '2026-02-10 14:44:42', '2026-02-17 07:52:02'),
(208, 1, 14, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(209, 1, 19, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(210, 1, 21, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-02-17 07:52:04', 'normal', '2026-02-10 14:44:51', '2026-02-17 07:52:04'),
(211, 1, 23, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-02-17 07:53:12', 'normal', '2026-02-10 14:44:51', '2026-02-17 07:53:12'),
(212, 1, 24, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(213, 1, 25, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(214, 1, 26, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-02-10 14:45:47', 'normal', '2026-02-10 14:44:51', '2026-02-10 14:45:47'),
(215, 1, 27, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(216, 1, 28, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(217, 1, 29, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(218, 1, 30, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(219, 1, 31, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(220, 1, 32, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(221, 1, 33, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(222, 1, 34, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(223, 1, 35, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-04 00:29:57', 'normal', '2026-02-10 14:44:51', '2026-03-04 00:29:57'),
(224, 1, 36, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'normal', '2026-02-10 14:44:51', '2026-03-07 06:34:14'),
(225, 1, 37, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(226, 1, 38, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(227, 1, 39, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(228, 1, 40, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(229, 1, 41, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(230, 1, 42, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(231, 1, 43, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(232, 1, 44, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(233, 1, 45, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(234, 1, 46, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(235, 1, 47, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(236, 1, 48, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(237, 1, 49, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(238, 1, 50, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(239, 1, 51, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(240, 1, 52, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(241, 1, 53, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(242, 1, 54, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(243, 1, 55, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(244, 1, 56, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(245, 1, 57, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(246, 1, 58, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(247, 1, 59, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(248, 1, 60, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(249, 1, 61, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(250, 1, 62, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(251, 1, 63, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(252, 1, 64, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(253, 1, 65, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(254, 1, 66, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(255, 1, 67, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(256, 1, 68, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(257, 1, 69, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(258, 1, 70, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(259, 1, 71, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(260, 1, 72, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(261, 1, 73, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(262, 1, 74, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(263, 1, 75, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(264, 1, 76, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(265, 1, 77, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(266, 1, 78, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(267, 1, 79, 2, 'cycle_activation', 'New Evaluation Cycle: Q4 2026 Review', 'Q4 2026 Review has been activated. Period: 2/10/2026 - 2/26/2026', '{\"cycle_id\": \"13\", \"end_date\": \"2026-02-25T19:00:00.000Z\", \"cycle_name\": \"Q4 2026 Review\", \"start_date\": \"2026-02-09T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-10 14:44:51', '2026-02-10 14:44:51'),
(268, 1, 21, 2, 'team_assignment', 'New Team Assigned: Q1 2026 review cycle', 'You have been assigned to evaluate Team BAN (4 employees) for the Q1 2026 review cycle cycle. Deadline: 3/6/2026', '{\"cycle_id\": 14, \"deadline\": \"2026-03-05T19:00:00.000Z\", \"team_name\": \"Team BAN\", \"cycle_name\": \"Q1 2026 review cycle\", \"employee_count\": 4}', '/performance-evaluation', 1, '2026-02-17 07:52:06', 'high', '2026-02-17 07:51:31', '2026-02-17 07:52:06'),
(269, 1, 23, 2, 'team_assignment', 'New Team Assigned: Q1 2026 review cycle', 'You have been assigned to evaluate TEAM DDD (4 employees) for the Q1 2026 review cycle cycle. Deadline: 3/6/2026', '{\"cycle_id\": 14, \"deadline\": \"2026-03-05T19:00:00.000Z\", \"team_name\": \"TEAM DDD\", \"cycle_name\": \"Q1 2026 review cycle\", \"employee_count\": 4}', '/performance-evaluation', 1, '2026-02-17 07:53:12', 'high', '2026-02-17 07:51:36', '2026-02-17 07:53:12'),
(270, 1, 14, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(271, 1, 19, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(272, 1, 21, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-02-17 09:25:00', 'normal', '2026-02-17 07:56:17', '2026-02-17 09:25:00'),
(273, 1, 23, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(274, 1, 24, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(275, 1, 25, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(276, 1, 26, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(277, 1, 27, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(278, 1, 28, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(279, 1, 29, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(280, 1, 30, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(281, 1, 31, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(282, 1, 32, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(283, 1, 33, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(284, 1, 34, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(285, 1, 35, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-04 00:29:57', 'normal', '2026-02-17 07:56:17', '2026-03-04 00:29:57'),
(286, 1, 36, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'normal', '2026-02-17 07:56:17', '2026-03-07 06:34:14'),
(287, 1, 37, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(288, 1, 38, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(289, 1, 39, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(290, 1, 40, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(291, 1, 41, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(292, 1, 42, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(293, 1, 43, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(294, 1, 44, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(295, 1, 45, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(296, 1, 46, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(297, 1, 47, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(298, 1, 48, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(299, 1, 49, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(300, 1, 50, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(301, 1, 51, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(302, 1, 52, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(303, 1, 53, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(304, 1, 54, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(305, 1, 55, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(306, 1, 56, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(307, 1, 57, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(308, 1, 58, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(309, 1, 59, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(310, 1, 60, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(311, 1, 61, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(312, 1, 62, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(313, 1, 63, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(314, 1, 64, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(315, 1, 65, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(316, 1, 66, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(317, 1, 67, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(318, 1, 68, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(319, 1, 69, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(320, 1, 70, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(321, 1, 71, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(322, 1, 72, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(323, 1, 73, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(324, 1, 74, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(325, 1, 75, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(326, 1, 76, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(327, 1, 77, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(328, 1, 78, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17'),
(329, 1, 79, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 review cycle', 'Q1 2026 review cycle has been activated. Period: 2/17/2026 - 3/6/2026', '{\"cycle_id\": \"14\", \"end_date\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"start_date\": \"2026-02-16T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-02-17 07:56:17', '2026-02-17 07:56:17');
INSERT INTO `notifications` (`id`, `organization_id`, `recipient_id`, `sender_id`, `notification_type`, `title`, `message`, `metadata`, `action_url`, `is_read`, `read_at`, `priority`, `created_at`, `updated_at`) VALUES
(330, 1, 21, NULL, 'deadline_reminder', '3 Days Until Q1 2026 review cycle Deadline', 'You have 2 pending evaluations for Q1 2026 review cycle. Deadline: 3/6/2026', '{\"cycle_id\": 14, \"deadline\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"pending_count\": 2, \"days_remaining\": 3}', '/performance-evaluation', 1, '2026-03-03 16:28:53', 'high', '2026-03-03 04:00:00', '2026-03-03 16:28:53'),
(331, 1, 23, NULL, 'deadline_reminder', '3 Days Until Q1 2026 review cycle Deadline', 'You have 4 pending evaluations for Q1 2026 review cycle. Deadline: 3/6/2026', '{\"cycle_id\": 14, \"deadline\": \"2026-03-05T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 review cycle\", \"pending_count\": 4, \"days_remaining\": 3}', '/performance-evaluation', 0, NULL, 'high', '2026-03-03 04:00:00', '2026-03-03 04:00:00'),
(332, 1, 36, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Assistant Professors (6 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Assistant Professors\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 6}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'high', '2026-03-03 16:21:38', '2026-03-07 06:34:14'),
(333, 1, 36, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Pure Mathematics (7 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Pure Mathematics\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 7}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'high', '2026-03-03 16:21:49', '2026-03-07 06:34:14'),
(334, 1, 35, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Applied Mathematicians (6 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Applied Mathematicians\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 6}', '/performance-evaluation', 1, '2026-03-04 00:29:57', 'high', '2026-03-03 16:21:56', '2026-03-04 00:29:57'),
(335, 1, 35, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Software Engineer (5 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Software Engineer\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 5}', '/performance-evaluation', 1, '2026-03-04 00:29:57', 'high', '2026-03-03 16:22:01', '2026-03-04 00:29:57'),
(336, 1, 34, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Algorithm Fixer (6 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Algorithm Fixer\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 6}', '/performance-evaluation', 0, NULL, 'high', '2026-03-03 16:22:10', '2026-03-03 16:22:10'),
(337, 1, 34, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Account managment (3 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Account managment\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 3}', '/performance-evaluation', 0, NULL, 'high', '2026-03-03 16:22:13', '2026-03-03 16:22:13'),
(338, 1, 33, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Support Team (4 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Support Team\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 4}', '/performance-evaluation', 0, NULL, 'high', '2026-03-03 16:22:22', '2026-03-03 16:22:22'),
(339, 1, 32, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Outreach Team (3 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Outreach Team\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 3}', '/performance-evaluation', 0, NULL, 'high', '2026-03-03 16:22:29', '2026-03-03 16:22:29'),
(340, 1, 23, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Marketing Team (4 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Marketing Team\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 4}', '/performance-evaluation', 0, NULL, 'high', '2026-03-03 16:22:36', '2026-03-03 16:22:36'),
(341, 1, 21, 2, 'team_assignment', 'New Team Assigned: Q1 2026 performnace Review', 'You have been assigned to evaluate Ai Engineer (7 employees) for the Q1 2026 performnace Review cycle. Deadline: 3/20/2026', '{\"cycle_id\": 15, \"deadline\": \"2026-03-19T19:00:00.000Z\", \"team_name\": \"Ai Engineer\", \"cycle_name\": \"Q1 2026 performnace Review\", \"employee_count\": 7}', '/performance-evaluation', 1, '2026-03-03 16:28:53', 'high', '2026-03-03 16:22:43', '2026-03-03 16:28:53'),
(342, 1, 14, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(343, 1, 19, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(344, 1, 21, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-03 16:28:53', 'normal', '2026-03-03 16:22:51', '2026-03-03 16:28:53'),
(345, 1, 23, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(346, 1, 24, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(347, 1, 25, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(348, 1, 26, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(349, 1, 27, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(350, 1, 28, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(351, 1, 29, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(352, 1, 30, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(353, 1, 31, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(354, 1, 32, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(355, 1, 33, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(356, 1, 34, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(357, 1, 35, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-04 00:29:57', 'normal', '2026-03-03 16:22:51', '2026-03-04 00:29:57'),
(358, 1, 36, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'normal', '2026-03-03 16:22:51', '2026-03-07 06:34:14'),
(359, 1, 37, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(360, 1, 38, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(361, 1, 39, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(362, 1, 40, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(363, 1, 41, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(364, 1, 42, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(365, 1, 43, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(366, 1, 44, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(367, 1, 45, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(368, 1, 46, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(369, 1, 47, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(370, 1, 48, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(371, 1, 49, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(372, 1, 50, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(373, 1, 51, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(374, 1, 52, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(375, 1, 53, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(376, 1, 54, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(377, 1, 55, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(378, 1, 56, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(379, 1, 57, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(380, 1, 58, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(381, 1, 59, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(382, 1, 60, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(383, 1, 61, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(384, 1, 62, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(385, 1, 63, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(386, 1, 64, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(387, 1, 65, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(388, 1, 66, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(389, 1, 67, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(390, 1, 68, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(391, 1, 69, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(392, 1, 70, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(393, 1, 71, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(394, 1, 72, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(395, 1, 73, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(396, 1, 74, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(397, 1, 75, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(398, 1, 76, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(399, 1, 77, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(400, 1, 78, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(401, 1, 79, 2, 'cycle_activation', 'New Evaluation Cycle: Q1 2026 performnace Review', 'Q1 2026 performnace Review has been activated. Period: 3/3/2026 - 3/20/2026', '{\"cycle_id\": \"15\", \"end_date\": \"2026-03-19T19:00:00.000Z\", \"cycle_name\": \"Q1 2026 performnace Review\", \"start_date\": \"2026-03-02T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-03 16:22:51', '2026-03-03 16:22:51'),
(402, 1, 36, 2, 'team_assignment', 'New Team Assigned: Q2 2026 Review Cycle', 'You have been assigned to evaluate Assistant Professors (6 employees) for the Q2 2026 Review Cycle cycle. Deadline: 3/18/2026', '{\"cycle_id\": 16, \"deadline\": \"2026-03-17T19:00:00.000Z\", \"team_name\": \"Assistant Professors\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"employee_count\": 6}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'high', '2026-03-06 00:24:24', '2026-03-07 06:34:14'),
(403, 1, 36, 2, 'team_assignment', 'New Team Assigned: Q2 2026 Review Cycle', 'You have been assigned to evaluate Assistant Professors (6 employees) for the Q2 2026 Review Cycle cycle. Deadline: 3/18/2026', '{\"cycle_id\": 16, \"deadline\": \"2026-03-17T19:00:00.000Z\", \"team_name\": \"Assistant Professors\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"employee_count\": 6}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'high', '2026-03-06 00:29:39', '2026-03-07 06:34:14'),
(404, 1, 36, 2, 'team_assignment', 'New Team Assigned: Q2 2026 Review Cycle', 'You have been assigned to evaluate Ai Engineer (7 employees) for the Q2 2026 Review Cycle cycle. Deadline: 3/12/2026', '{\"cycle_id\": 17, \"deadline\": \"2026-03-11T19:00:00.000Z\", \"team_name\": \"Ai Engineer\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"employee_count\": 7}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'high', '2026-03-06 02:29:36', '2026-03-07 06:34:14'),
(405, 1, 14, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(406, 1, 19, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(407, 1, 21, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(408, 1, 23, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(409, 1, 24, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(410, 1, 25, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(411, 1, 26, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(412, 1, 27, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(413, 1, 28, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(414, 1, 29, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(415, 1, 30, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(416, 1, 31, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(417, 1, 32, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(418, 1, 33, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(419, 1, 34, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(420, 1, 35, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(421, 1, 36, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 1, '2026-03-07 06:34:14', 'normal', '2026-03-06 03:04:58', '2026-03-07 06:34:14'),
(422, 1, 37, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(423, 1, 38, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(424, 1, 39, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(425, 1, 40, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(426, 1, 41, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(427, 1, 42, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(428, 1, 43, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(429, 1, 44, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(430, 1, 45, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(431, 1, 46, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(432, 1, 47, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(433, 1, 48, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(434, 1, 49, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(435, 1, 50, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(436, 1, 51, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(437, 1, 52, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(438, 1, 53, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(439, 1, 54, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(440, 1, 55, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(441, 1, 56, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(442, 1, 57, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(443, 1, 58, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(444, 1, 59, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(445, 1, 60, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(446, 1, 61, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58');
INSERT INTO `notifications` (`id`, `organization_id`, `recipient_id`, `sender_id`, `notification_type`, `title`, `message`, `metadata`, `action_url`, `is_read`, `read_at`, `priority`, `created_at`, `updated_at`) VALUES
(447, 1, 62, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(448, 1, 63, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(449, 1, 64, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(450, 1, 65, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(451, 1, 66, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(452, 1, 67, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(453, 1, 68, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(454, 1, 69, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(455, 1, 70, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(456, 1, 71, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(457, 1, 72, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(458, 1, 73, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(459, 1, 74, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(460, 1, 75, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(461, 1, 76, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(462, 1, 77, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(463, 1, 78, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58'),
(464, 1, 79, 2, 'cycle_activation', 'New Evaluation Cycle: Q2 2026 Review Cycle', 'Q2 2026 Review Cycle has been activated. Period: 3/6/2026 - 3/12/2026', '{\"cycle_id\": \"17\", \"end_date\": \"2026-03-11T19:00:00.000Z\", \"cycle_name\": \"Q2 2026 Review Cycle\", \"start_date\": \"2026-03-05T19:00:00.000Z\"}', '/performance-evaluation', 0, NULL, 'normal', '2026-03-06 03:04:58', '2026-03-06 03:04:58');

-- --------------------------------------------------------

--
-- Table structure for table `notification_preferences`
--

DROP TABLE IF EXISTS `notification_preferences`;
CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_employee_type` (`employee_id`,`notification_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `industry_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Other',
  `company_size` enum('1-10','11-50','51-200','201-500','501-1000','1000+') COLLATE utf8mb4_unicode_ci DEFAULT '1-10',
  `description` text COLLATE utf8mb4_unicode_ci,
  `headquarters_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `establishment_year` int(11) DEFAULT NULL,
  `operating_countries` text COLLATE utf8mb4_unicode_ci,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscription_tier` enum('free','basic','professional','enterprise') COLLATE utf8mb4_unicode_ci DEFAULT 'free',
  `subscription_status` enum('active','inactive','trial','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'trial',
  `subscription_ends_at` timestamp NULL DEFAULT NULL,
  `max_employees` int(11) DEFAULT '10',
  `created_by` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `business_email` (`business_email`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_active` (`is_active`,`deleted_at`),
  KEY `idx_subscription` (`subscription_status`,`subscription_ends_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `organizations`
--

INSERT INTO `organizations` (`id`, `organization_name`, `business_email`, `industry_type`, `company_size`, `description`, `headquarters_location`, `website_url`, `establishment_year`, `operating_countries`, `logo`, `subscription_tier`, `subscription_status`, `subscription_ends_at`, `max_employees`, `created_by`, `is_active`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, 'Namal Universty', 'namal@edu.pk', 'Education', '1-10', NULL, 'Namal universty Mianwalii 30km-Mianwali-Talagang Rd,42250', 'https://namal.edu.pk/', 2002, 'Pakistan', NULL, 'free', 'trial', NULL, 10, 2, 1, NULL, '2025-12-09 10:12:35', '2025-12-09 10:12:35'),
(7, 'Zapta', 'zapta@edu.pk', 'Finance', '1-10', NULL, 'Zapta islamabad 30km-Mianwali-Talagang Rd,42250', 'https://zaptatech.com/', 2000, 'Pakistan', NULL, 'free', 'trial', NULL, 10, 7, 1, NULL, '2026-03-09 07:27:42', '2026-03-09 07:27:42');

-- --------------------------------------------------------

--
-- Table structure for table `parameters`
--

DROP TABLE IF EXISTS `parameters`;
CREATE TABLE IF NOT EXISTS `parameters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) DEFAULT NULL,
  `parameter_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `min_score` decimal(5,2) DEFAULT '0.00',
  `max_score` decimal(5,2) DEFAULT '10.00',
  `is_global` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_global` (`is_global`),
  KEY `idx_status` (`status`,`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=425 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parameters`
--

INSERT INTO `parameters` (`id`, `organization_id`, `parameter_name`, `description`, `category`, `min_score`, `max_score`, `is_global`, `status`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, NULL, 'Teamwork', 'Working together to achieve common goals', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(2, NULL, 'Productivity', 'Completing tasks efficiently and on time', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(3, NULL, 'Communication Skills', 'Clearly conveys ideas and information', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(4, NULL, 'Attendance', 'Punctuality and presence', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(5, NULL, 'Ethics', 'Integrity and professional responsibility', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(6, NULL, 'Customer Relations', 'Client handling and service skills', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(7, NULL, 'Leadership', 'Ability to guide and motivate team members', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(8, NULL, 'Problem Solving', 'Analytical thinking and solution development', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(9, NULL, 'Initiative', 'Proactive approach to work and challenges', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(10, NULL, 'Quality of Work', 'Accuracy and attention to detail', 'General', '0.00', '10.00', 1, 'active', NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(17, 1, 'Unit Testing', 'unit testing for engineers', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-28 13:42:31', '2025-12-28 13:42:31'),
(18, 1, 'integration Testing', 'integration Testing for engineers', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-28 13:52:15', '2025-12-28 13:52:15'),
(19, 1, 'Code For Quality', 'code qulaity Paramter for software devlopment Team', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-28 15:54:09', '2025-12-30 03:06:46'),
(20, 1, 'Bug Bounty', 'Bug bounty paramter fr software devlopment Team', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-30 02:57:33', '2025-12-30 02:57:33'),
(21, 1, 'BUg Bounty', 'Bug bounty for Software devleopment', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-30 05:56:10', '2025-12-30 05:56:10'),
(22, 1, 'Problem Solving', 'Problem solving for software development', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-30 05:56:35', '2025-12-30 05:56:35'),
(23, 1, 'Clean code', 'Clean Code for Software Development', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-30 05:56:59', '2025-12-30 05:56:59'),
(24, 1, 'Code Review Speed', 'Code Review For software development', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-30 05:58:41', '2025-12-30 05:58:41'),
(25, 1, 'Stakeholder Feedback', 'Stackholder feedback for Software development Team', 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-30 05:59:21', '2025-12-30 05:59:21'),
(26, 1, 'code qulaity', NULL, 'General', '0.00', '10.00', 0, 'active', NULL, '2025-12-31 06:38:42', '2025-12-31 06:38:42'),
(27, 1, 'Hardware Architecture', 'Hardware Architceture for Engineering Team Review', 'General', '0.00', '10.00', 0, 'active', NULL, '2026-01-02 02:37:35', '2026-01-02 02:37:35'),
(101, NULL, 'Teaching Quality', 'Effectiveness of teaching methodology and student engagement', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(102, NULL, 'Research Output', 'Quality and quantity of research publications', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(103, NULL, 'Student Feedback', 'Student satisfaction and feedback scores', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(104, NULL, 'Course Material Development', 'Creating and updating course content', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(105, NULL, 'Exam & Assessment Design', 'Quality of assessments and grading', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(106, NULL, 'Mentorship & Guidance', 'Student advising and career guidance', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(107, NULL, 'Professional Development', 'Participation in workshops, conferences', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(108, NULL, 'Community Service', 'University and community engagement', 'Academic', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(201, NULL, 'Code Quality', 'Code readability, maintainability, and best practices', 'Technical', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(202, NULL, 'Technical Expertise', 'Depth of technical knowledge and skills', 'Technical', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(203, NULL, 'Project Delivery', 'Meeting deadlines and delivering on commitments', 'Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(204, NULL, 'Bug Resolution', 'Speed and quality of bug fixes', 'Technical', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(205, NULL, 'Code Review Participation', 'Quality of code reviews given and received', 'Technical', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(206, NULL, 'Innovation & Problem Solving', 'Creative solutions and technical innovation', 'Technical', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(207, NULL, 'Collaboration', 'Working effectively with team members', 'Soft Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(208, NULL, 'Testing & Quality Assurance', 'Writing tests and ensuring quality', 'Technical', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(209, NULL, 'Documentation', 'Quality of technical documentation', 'Technical', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(210, NULL, 'Client Communication', 'Effective communication with clients', 'Soft Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-05 13:38:01', '2026-01-05 13:38:01'),
(301, NULL, 'Lecture Clarity', 'Delivers lectures in a clear, understandable manner.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(302, NULL, 'Course Content Relevance', 'Ensures course material is up-to-date and relevant to industry/field.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(303, NULL, 'Student Engagement Techniques', 'Uses interactive methods to keep students engaged.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(304, NULL, 'Grading Fairness', 'Provides fair and consistent grading across all assessments.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(305, NULL, 'Availability to Students', 'Is accessible to students during office hours and via email.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(306, NULL, 'Curriculum Development', 'Contributes to the design and improvement of the curriculum.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(307, NULL, 'Use of Technology in Teaching', 'Effectively integrates technology into the learning process.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(308, NULL, ' Classroom Management', 'Maintains a conducive learning environment.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(309, NULL, 'Student Feedback Response', 'Takes constructive action based on student feedback.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(310, NULL, 'Practical/Lab Instruction', 'effectively guides students in practical or laboratory settings.', 'Teaching & Academics', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(311, NULL, 'Journal Publications', 'Publishes research in recognized peer-reviewed journals.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(312, NULL, 'Conference Presentations', 'Presents research findings at national/international conferences.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(313, NULL, 'Grant Securance', 'Successfully secures research grants and funding.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(314, NULL, 'Citation Impact', 'Number of citations and impact of published work.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(315, NULL, 'Research Collaboration', 'Collaborates with other researchers or institutions.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(316, NULL, 'Student Research Supervision', 'Mentors students in their research projects/theses.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(317, NULL, 'Book/Chapter Authorship', 'Authors or contributes to academic books or chapters.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(318, NULL, 'Peer Review Contribution', 'Serves as a reviewer for journals or conferences.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(319, NULL, 'Patent Applications', 'Files for patents arising from research activities.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(320, NULL, 'Research Ethics', 'Adheres to ethical standards in all research activities.', 'Research & Publications', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(321, NULL, 'Academic Advising', 'Provides guidance on course selection and academic path.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(322, NULL, 'Career Counseling', 'Assists students in planning their future careers.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(323, NULL, 'Thesis Supervision', 'Supervises graduate or undergraduate thesis work effectively.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(324, NULL, 'Student Club Advising', 'Serves as an advisor for student organizations.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(325, NULL, 'Remedial Support', 'Provides extra help to struggling students.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(326, NULL, 'Letters of Recommendation', 'Writes timely and thoughtful recommendation letters.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(327, NULL, 'Conflict Resolution (Students)', 'Helps resolve conflicts between students or within groups.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(328, NULL, 'Alumni Engagement', 'Maintains connections with alumni for mentorship opportunities.', 'Student Mentorship', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(329, NULL, 'Department Meeting Attendance', 'Regularly attends and participates in department meetings.', 'Administrative Duties', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(330, NULL, 'Committee Service', 'Serves actively on university or department committees.', 'Administrative Duties', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(331, NULL, 'Accreditation Work', 'Contributes to program accreditation processes.', 'Administrative Duties', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(332, NULL, 'Timely Grades Submission', 'Submits grades and reports by deadlines.', 'Administrative Duties', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(333, NULL, 'Budget Management', 'Manages allocated budgets/resources responsibly.', 'Administrative Duties', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(334, NULL, 'Event Organization', 'Helps organize departmental or university events.', 'Administrative Duties', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(335, NULL, 'Policy Compliance', 'Adheres to all university policies and regulations.', 'Administrative Duties', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(336, NULL, 'Worksop Participation', 'Attends workshops to improve teaching/research skills.', 'Professional Development', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(337, NULL, 'Certification Acquisition', 'Earns relevant professional certifications.', 'Professional Development', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(338, NULL, 'Industry Networking', 'Maintains ties with industry for currency.', 'Professional Development', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(339, NULL, 'Skill Upgrading', 'Continuously updates knowledge in subject area.', 'Professional Development', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(340, NULL, 'Invited Talks', 'Delivers guest lectures or talks at other institutions.', 'Professional Development', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(341, NULL, 'New Methodologies', 'Implements new pedagogical strategies.', 'Innovation in Teaching', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(342, NULL, 'Online Learning Material', 'Creates high-quality online resources.', 'Innovation in Teaching', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(343, NULL, 'Flipped Classroom Adoption', 'Utilizes flipped classroom techniques effectively.', 'Innovation in Teaching', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(344, NULL, 'Cross-Disciplinary Teaching', 'Incorporates elements from other disciplines.', 'Innovation in Teaching', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(345, NULL, 'Gamification', 'Uses game elements to enhance learning.', 'Innovation in Teaching', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(346, NULL, 'Interdepartmental Projects', 'Works on projects with other departments.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(347, NULL, 'External Partnerships', 'Collaborates with external organizations.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(348, NULL, 'Team Teaching', 'Co-teaches courses effectively with colleagues.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(349, NULL, 'Resource Sharing', 'Shares teaching resources with peers.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(350, NULL, 'Mentoring Junior Faculty', 'Provides mentorship to new faculty members.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(351, NULL, 'Plagiarism Detection', 'Actively monitors and prevents plagiarism.', 'Academic Integrity', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(352, NULL, 'Ethical Conduct', 'Demonstrates high ethical standards.', 'Academic Integrity', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(353, NULL, 'Copyright Compliance', 'Respects copyright laws in teaching materials.', 'Academic Integrity', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(354, NULL, 'Fairness in Treatment', 'Treats all students with equity and respect.', 'Academic Integrity', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(355, NULL, 'Confidentiality', 'Maintains confidentiality of student records.', 'Academic Integrity', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(356, NULL, 'Public Lectures', 'Gives lectures to the general public.', 'Community Engagement', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(357, NULL, 'Media Contribution', 'Contributes expertise to media outlets.', 'Community Engagement', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(358, NULL, 'Volunteer Work', 'Engages in volunteer activities related to expertise.', 'Community Engagement', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(359, NULL, 'School Outreach', 'Participates in programs for prospective students.', 'Community Engagement', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(360, NULL, 'Advisory Board Membership', 'Serves on advisory boards for external bodies.', 'Community Engagement', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(361, NULL, 'Coding Proficiency', 'Writes clean, efficient, and working code.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(362, NULL, 'System Architecture', 'Understands and designs scalable system architectures.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(363, NULL, 'Database Management', 'Efficiently designs and queries databases.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(364, NULL, 'API Development', 'Builds robust and documented APIs.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(365, NULL, 'Security Best Practices', 'Implements secure coding practices.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(366, NULL, 'Algorithm Optimization', 'Optimizes algorithms for performance.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(367, NULL, 'Cloud Services Usage', 'Effectively uses cloud platforms (AWS, Azure, etc.).', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(368, NULL, 'Version Control (Git)', 'Uses Git effectively for version control.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(369, NULL, 'Framework Knowledge', 'Demonstrates expertise in relevant frameworks.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(370, NULL, 'Responsive Design', 'Creates interfaces that work on all devices.', 'Technical Skills', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(371, NULL, 'Deadline Adherence', 'Consistently meets project deadlines.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(372, NULL, 'Estimation Accuracy', 'Provides accurate time estimates for tasks.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(373, NULL, 'Sprint Goal Completion', 'Completes assigned sprint tasks consistently.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(374, NULL, 'Requirements Fulfillment', 'Delivers features that match requirements.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(375, NULL, 'Progress Reporting', 'Updates stakeholders on progress regularly.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(376, NULL, 'Task Prioritization', 'Effectively prioritizes critical tasks.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(377, NULL, 'Resource Management', 'Uses available resources efficiently.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(378, NULL, 'Multi-tasking', 'Handles multiple tasks without loss of quality.', 'Project Delivery', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(379, NULL, 'Code Readability', 'Writes code that is easy to understand.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(380, NULL, 'Refactoring', 'Proactively refactors code to improve structure.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(381, NULL, 'Technical Debt Management', 'Address technical debt in a timely manner.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(382, NULL, 'Modularity', 'Writes modular and reusable code.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(383, NULL, 'Error Handling', 'Implements robust error handling.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(384, NULL, 'Commenting', 'Adds necessary comments for complex logic.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(385, NULL, 'Style Guide Adherence', 'Follows the team\'s coding style guide.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(386, NULL, 'Code Efficiency', 'Writes code that runs with minimal resource usage.', 'Code Quality', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(387, NULL, 'Unit Test Coverage', 'Maintains high code coverage with unit tests.', 'Testing & QA', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(388, NULL, 'Integration Testing', 'Writes effective integration tests.', 'Testing & QA', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(389, NULL, 'Bug Reproduction', 'Accurately reproduces reported bugs.', 'Testing & QA', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(390, NULL, 'Test Automation', 'Contributes to test automation suites.', 'Testing & QA', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(391, NULL, 'Edge Case Handling', 'Considers and tests for edge cases.', 'Testing & QA', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(392, NULL, 'Performance Testing', 'Tests application performance under load.', 'Testing & QA', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(393, NULL, 'Code Review Quality', 'Provides constructive feedback in code reviews.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(394, NULL, 'Pair Programming', 'Effectively collaborates in pair programming sessions.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(395, NULL, 'Knowledge Sharing', 'Shares new learnings with the team.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(396, NULL, 'Cross-Team Communication', 'Communicates effectively with other teams (Design, Product).', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(397, NULL, 'Mentoring Developers', 'Mentors junior developers effectively.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(398, NULL, 'Meeting Participation', 'Contributes actively to team meetings.', 'Collaboration', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(399, NULL, 'Debugging Skills', 'Rapidly identifies and fixes bugs.', 'Problem Solving', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(400, NULL, 'Root Cause Analysis', 'Identifies the root cause of issues.', 'Problem Solving', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(401, NULL, 'Critical Thinking', 'Evaluates solutions critically before implementation.', 'Problem Solving', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(402, NULL, 'Innovative Solutions', 'Proposes creative solutions to complex problems.', 'Problem Solving', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(403, NULL, 'Adaptability', 'Adapts quickly to changing requirements.', 'Problem Solving', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(404, NULL, 'Research Ability', 'effectively researches new technologies/solutions.', 'Problem Solving', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(405, NULL, 'CI/CD Pipeline', 'Maintains and improves CI/CD pipelines.', 'DevOps & Deployment', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(406, NULL, 'Monitoring & Alerting', 'Sets up effective monitoring and alerts.', 'DevOps & Deployment', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(407, NULL, 'Incident Response', 'Responds effectively to production incidents.', 'DevOps & Deployment', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(408, NULL, 'Infrastructure as Code', 'Manages infrastructure using code (Terraform, etc.).', 'DevOps & Deployment', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(409, NULL, 'Containerization', 'Uses Docker/Kubernetes effectively.', 'DevOps & Deployment', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(410, NULL, 'Deployment Safety', 'Ensures safe and zero-downtime deployments.', 'DevOps & Deployment', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(411, NULL, 'Requirement Gathering', ' Effectively gathers and clarifies requirements.', 'Client Management', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(412, NULL, 'Demo Presentation', 'Presents demos clearly to clients.', 'Client Management', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(413, NULL, 'Expectation Management', 'Manages client expectations realistically.', 'Client Management', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(414, NULL, 'Professionalism', 'Maintains professionalism in client interactions.', 'Client Management', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(415, NULL, 'Feedback Incorporation', 'Incorporates client feedback into the product.', 'Client Management', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(416, NULL, 'Technical Documentation', 'Maintains comprehensive technical docs.', 'Documentation', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(417, NULL, 'API Documentation', 'Keeps API documentation (Swagger) up to date.', 'Documentation', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(418, NULL, 'Decision Making', 'Makes sound technical decisions.', 'Leadership', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(419, NULL, 'Team Motivation', 'Motivates the team to achieve goals.', 'Leadership', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(420, NULL, 'Strategic Planning', 'Contributes to long-term technical strategy.', 'Leadership', '0.00', '10.00', 1, 'active', NULL, '2026-01-06 13:49:53', '2026-01-06 13:49:53'),
(421, 1, 'Code qulaity', 'jajaja', 'General', '0.00', '10.00', 0, 'active', NULL, '2026-01-06 15:16:36', '2026-01-06 15:16:36'),
(422, 1, 'Code quality', NULL, 'General', '0.00', '10.00', 0, 'active', NULL, '2026-01-08 19:18:40', '2026-01-08 19:18:40'),
(423, 1, 'hhh', NULL, 'General', '0.00', '10.00', 0, 'active', NULL, '2026-01-08 19:23:14', '2026-01-08 19:23:14'),
(424, 1, 'hhh', '88', 'General', '0.00', '10.00', 0, 'active', NULL, '2026-01-08 19:34:31', '2026-01-08 19:34:31');

-- --------------------------------------------------------

--
-- Table structure for table `parameter_matrices`
--

DROP TABLE IF EXISTS `parameter_matrices`;
CREATE TABLE IF NOT EXISTS `parameter_matrices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `matrix_id` int(11) NOT NULL,
  `parameter_id` int(11) NOT NULL,
  `weightage` int(11) NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_matrix_parameter` (`matrix_id`,`parameter_id`),
  KEY `idx_matrix` (`matrix_id`),
  KEY `idx_parameter` (`parameter_id`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parameter_matrices`
--

INSERT INTO `parameter_matrices` (`id`, `matrix_id`, `parameter_id`, `weightage`, `deleted_at`, `created_at`, `updated_at`) VALUES
(74, 10, 101, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(75, 10, 102, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(76, 10, 105, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(77, 10, 108, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(78, 10, 303, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(79, 10, 305, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(80, 10, 310, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(81, 10, 316, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(82, 10, 17, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(83, 10, 18, 10, NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(86, 12, 101, 40, NULL, '2026-03-05 07:19:53', '2026-03-05 07:19:53'),
(87, 12, 102, 50, NULL, '2026-03-05 07:19:53', '2026-03-05 07:19:53'),
(90, 13, 101, 40, NULL, '2026-03-05 07:23:55', '2026-03-05 07:23:55'),
(91, 13, 102, 50, NULL, '2026-03-05 07:23:55', '2026-03-05 07:23:55'),
(96, 11, 101, 50, NULL, '2026-03-05 07:56:51', '2026-03-05 07:56:51'),
(97, 11, 102, 50, NULL, '2026-03-05 07:56:51', '2026-03-05 07:56:51');

-- --------------------------------------------------------

--
-- Table structure for table `performance_matrices`
--

DROP TABLE IF EXISTS `performance_matrices`;
CREATE TABLE IF NOT EXISTS `performance_matrices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `matrix_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `matrix_type` enum('staff','line-manager') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'staff',
  `evaluation_period` enum('monthly','quarterly','bi-annual','annual') COLLATE utf8mb4_unicode_ci DEFAULT 'quarterly',
  `created_by` int(11) NOT NULL,
  `status` enum('active','Draft','locked') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_status` (`status`,`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `performance_matrices`
--

INSERT INTO `performance_matrices` (`id`, `organization_id`, `matrix_name`, `matrix_type`, `evaluation_period`, `created_by`, `status`, `deleted_at`, `created_at`, `updated_at`) VALUES
(10, 1, 'Genral Review', 'staff', 'quarterly', 2, 'active', NULL, '2026-03-03 16:20:14', '2026-03-03 16:20:14'),
(11, 1, 'Line manager Review', 'line-manager', 'quarterly', 2, 'active', NULL, '2026-03-05 07:08:41', '2026-03-05 07:56:51');

-- --------------------------------------------------------

--
-- Table structure for table `performance_ratings`
--

DROP TABLE IF EXISTS `performance_ratings`;
CREATE TABLE IF NOT EXISTS `performance_ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `min_score` decimal(5,2) NOT NULL,
  `max_score` decimal(5,2) NOT NULL,
  `color` varchar(7) NOT NULL,
  `bg_color` varchar(7) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_org_name` (`organization_id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `performance_ratings`
--

INSERT INTO `performance_ratings` (`id`, `organization_id`, `name`, `min_score`, `max_score`, `color`, `bg_color`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 1, 'Excellent', '90.00', '100.00', '#4fbf53', '#E8F5E9', 1, '2026-03-09 06:34:39', '2026-03-09 07:05:47'),
(4, 1, 'Very Good', '80.00', '89.99', '#8BC34A', '#F1F8E9', 2, '2026-03-09 06:34:39', '2026-03-09 06:34:39'),
(7, 1, 'Good', '70.00', '79.99', '#FFC107', '#FFF9C4', 3, '2026-03-09 06:34:39', '2026-03-09 06:34:39'),
(10, 1, 'Satisfactory', '60.00', '69.99', '#FF9800', '#FFE0B2', 4, '2026-03-09 06:34:39', '2026-03-09 06:34:39'),
(13, 1, 'Needs Improvement', '0.00', '59.99', '#F44336', '#FFEBEE', 5, '2026-03-09 06:34:39', '2026-03-09 06:34:39'),
(31, 7, 'Excellent', '90.00', '100.00', '#4CAF50', '#E8F5E9', 1, '2026-03-09 07:27:42', '2026-03-09 07:27:42'),
(32, 7, 'Very Good', '80.00', '89.99', '#8BC34A', '#F1F8E9', 2, '2026-03-09 07:27:42', '2026-03-09 07:27:42'),
(33, 7, 'Good', '70.00', '79.99', '#FFC107', '#FFF9C4', 3, '2026-03-09 07:27:42', '2026-03-09 07:27:42'),
(34, 7, 'Satisfactory', '60.00', '69.99', '#FF9800', '#FFE0B2', 4, '2026-03-09 07:27:42', '2026-03-09 07:27:42'),
(35, 7, 'Needs Improvement', '0.00', '59.99', '#F44336', '#FFEBEE', 5, '2026-03-09 07:27:42', '2026-03-09 07:27:42');

-- --------------------------------------------------------

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
CREATE TABLE IF NOT EXISTS `teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `team_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_description` text COLLATE utf8mb4_unicode_ci,
  `line_manager_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_department` (`department_id`),
  KEY `idx_line_manager` (`line_manager_id`),
  KEY `idx_active` (`is_active`,`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teams`
--

INSERT INTO `teams` (`id`, `organization_id`, `department_id`, `team_name`, `team_description`, `line_manager_id`, `is_active`, `deleted_at`, `created_at`, `updated_at`) VALUES
(15, 1, 12, 'Ai Engineer', NULL, NULL, 1, NULL, '2026-03-03 14:36:57', '2026-03-03 14:36:57'),
(16, 1, 11, 'Marketing Team', NULL, NULL, 1, NULL, '2026-03-03 14:37:32', '2026-03-03 14:42:47'),
(17, 1, 11, 'Outreach Team', NULL, NULL, 1, NULL, '2026-03-03 14:37:54', '2026-03-03 14:37:54'),
(18, 1, 9, 'Support Team', NULL, NULL, 1, NULL, '2026-03-03 14:38:24', '2026-03-03 14:38:24'),
(19, 1, 9, 'Account managment', NULL, NULL, 1, NULL, '2026-03-03 14:40:49', '2026-03-03 14:40:49'),
(20, 1, 7, 'Algorithm Fixer', NULL, NULL, 1, NULL, '2026-03-03 14:42:02', '2026-03-03 14:42:02'),
(21, 1, 7, 'Software Engineer', NULL, NULL, 1, NULL, '2026-03-03 14:42:32', '2026-03-03 14:42:32'),
(22, 1, 8, 'Applied Mathematicians', NULL, NULL, 1, NULL, '2026-03-03 14:45:02', '2026-03-03 14:45:02'),
(23, 1, 7, 'Pure Mathematics', NULL, NULL, 1, NULL, '2026-03-03 14:45:51', '2026-03-03 14:45:51'),
(24, 1, 10, 'Assistant Professors', NULL, NULL, 1, NULL, '2026-03-03 14:47:07', '2026-03-03 14:47:07');

-- --------------------------------------------------------

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_team_employee` (`team_id`,`employee_id`),
  KEY `idx_team` (`team_id`),
  KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `team_members`
--

INSERT INTO `team_members` (`id`, `team_id`, `employee_id`, `created_at`) VALUES
(31, 15, 79, '2026-03-03 14:36:57'),
(32, 15, 75, '2026-03-03 14:36:57'),
(33, 15, 69, '2026-03-03 14:36:57'),
(34, 15, 56, '2026-03-03 14:36:57'),
(35, 15, 55, '2026-03-03 14:36:57'),
(36, 15, 68, '2026-03-03 14:36:57'),
(37, 15, 57, '2026-03-03 14:36:57'),
(42, 17, 53, '2026-03-03 14:37:54'),
(43, 17, 52, '2026-03-03 14:37:54'),
(44, 17, 31, '2026-03-03 14:37:54'),
(45, 18, 72, '2026-03-03 14:38:24'),
(46, 18, 78, '2026-03-03 14:38:24'),
(47, 18, 63, '2026-03-03 14:38:24'),
(48, 18, 62, '2026-03-03 14:38:24'),
(49, 19, 48, '2026-03-03 14:40:49'),
(50, 19, 47, '2026-03-03 14:40:49'),
(51, 19, 46, '2026-03-03 14:40:49'),
(52, 20, 76, '2026-03-03 14:42:02'),
(53, 20, 70, '2026-03-03 14:42:02'),
(54, 20, 59, '2026-03-03 14:42:02'),
(55, 20, 58, '2026-03-03 14:42:02'),
(56, 20, 40, '2026-03-03 14:42:02'),
(57, 20, 39, '2026-03-03 14:42:02'),
(58, 21, 38, '2026-03-03 14:42:32'),
(59, 21, 37, '2026-03-03 14:42:32'),
(60, 21, 25, '2026-03-03 14:42:32'),
(61, 21, 24, '2026-03-03 14:42:32'),
(62, 21, 14, '2026-03-03 14:42:32'),
(63, 16, 54, '2026-03-03 14:42:47'),
(64, 16, 66, '2026-03-03 14:42:47'),
(65, 16, 67, '2026-03-03 14:42:47'),
(66, 16, 74, '2026-03-03 14:42:47'),
(67, 22, 77, '2026-03-03 14:45:02'),
(68, 22, 71, '2026-03-03 14:45:02'),
(69, 22, 61, '2026-03-03 14:45:02'),
(70, 22, 60, '2026-03-03 14:45:02'),
(71, 22, 44, '2026-03-03 14:45:02'),
(72, 22, 43, '2026-03-03 14:45:02'),
(73, 23, 42, '2026-03-03 14:45:51'),
(74, 23, 41, '2026-03-03 14:45:51'),
(75, 23, 28, '2026-03-03 14:45:51'),
(76, 23, 29, '2026-03-03 14:45:51'),
(77, 23, 27, '2026-03-03 14:45:51'),
(78, 23, 26, '2026-03-03 14:45:51'),
(79, 23, 19, '2026-03-03 14:45:51'),
(80, 24, 73, '2026-03-03 14:47:07'),
(81, 24, 65, '2026-03-03 14:47:07'),
(82, 24, 64, '2026-03-03 14:47:07'),
(83, 24, 51, '2026-03-03 14:47:07'),
(84, 24, 50, '2026-03-03 14:47:07'),
(85, 24, 49, '2026-03-03 14:47:07');

-- --------------------------------------------------------

--
-- Table structure for table `team_reminders`
--

DROP TABLE IF EXISTS `team_reminders`;
CREATE TABLE IF NOT EXISTS `team_reminders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignment_id` int(10) UNSIGNED NOT NULL COMMENT 'Reference to cycle_team_assignments',
  `line_manager_id` int(11) NOT NULL COMMENT 'Line manager who sent the reminder',
  `reminder_sent` tinyint(1) DEFAULT '1',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assignment` (`assignment_id`),
  KEY `idx_line_manager` (`line_manager_id`),
  KEY `idx_sent_at` (`sent_at`),
  KEY `idx_assignment_sent_at` (`assignment_id`,`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks reminder notifications sent by line managers to teams';

-- --------------------------------------------------------

--
-- Table structure for table `template_parameters`
--

DROP TABLE IF EXISTS `template_parameters`;
CREATE TABLE IF NOT EXISTS `template_parameters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `parameter_id` int(11) NOT NULL,
  `weightage` int(11) NOT NULL DEFAULT '0',
  `is_required` tinyint(1) DEFAULT '1' COMMENT 'Must be included when using template',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template_parameter` (`template_id`,`parameter_id`),
  KEY `fk_tp_template` (`template_id`),
  KEY `fk_tp_parameter` (`parameter_id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `template_parameters`
--

INSERT INTO `template_parameters` (`id`, `template_id`, `parameter_id`, `weightage`, `is_required`, `created_at`) VALUES
(1, 1, 101, 25, 1, '2026-01-05 13:38:01'),
(2, 1, 102, 20, 1, '2026-01-05 13:38:01'),
(3, 1, 103, 15, 1, '2026-01-05 13:38:01'),
(4, 1, 104, 10, 1, '2026-01-05 13:38:01'),
(5, 1, 105, 10, 1, '2026-01-05 13:38:01'),
(6, 1, 106, 10, 1, '2026-01-05 13:38:01'),
(7, 1, 107, 5, 0, '2026-01-05 13:38:01'),
(8, 1, 108, 5, 0, '2026-01-05 13:38:01'),
(9, 2, 201, 20, 1, '2026-01-05 13:38:01'),
(10, 2, 202, 15, 1, '2026-01-05 13:38:01'),
(11, 2, 203, 15, 1, '2026-01-05 13:38:01'),
(12, 2, 204, 10, 1, '2026-01-05 13:38:01'),
(13, 2, 205, 10, 1, '2026-01-05 13:38:01'),
(14, 2, 206, 10, 1, '2026-01-05 13:38:01'),
(15, 2, 207, 10, 1, '2026-01-05 13:38:01'),
(16, 2, 208, 5, 0, '2026-01-05 13:38:01'),
(17, 2, 209, 3, 0, '2026-01-05 13:38:01'),
(18, 2, 210, 2, 0, '2026-01-05 13:38:01'),
(19, 10, 301, 10, 1, '2026-01-06 13:49:53'),
(20, 10, 302, 10, 1, '2026-01-06 13:49:53'),
(21, 10, 303, 10, 1, '2026-01-06 13:49:53'),
(22, 10, 311, 10, 1, '2026-01-06 13:49:53'),
(23, 10, 312, 10, 1, '2026-01-06 13:49:53'),
(24, 10, 313, 5, 1, '2026-01-06 13:49:53'),
(25, 10, 321, 5, 1, '2026-01-06 13:49:53'),
(26, 10, 323, 5, 1, '2026-01-06 13:49:53'),
(27, 10, 305, 5, 1, '2026-01-06 13:49:53'),
(28, 10, 330, 5, 1, '2026-01-06 13:49:53'),
(29, 10, 332, 5, 1, '2026-01-06 13:49:53'),
(30, 10, 336, 5, 0, '2026-01-06 13:49:54'),
(31, 10, 341, 5, 0, '2026-01-06 13:49:54'),
(32, 10, 347, 5, 0, '2026-01-06 13:49:54'),
(33, 10, 351, 5, 1, '2026-01-06 13:49:54'),
(34, 11, 361, 10, 1, '2026-01-06 13:49:54'),
(35, 11, 362, 10, 1, '2026-01-06 13:49:54'),
(36, 11, 379, 10, 1, '2026-01-06 13:49:54'),
(37, 11, 381, 5, 1, '2026-01-06 13:49:54'),
(38, 11, 371, 10, 1, '2026-01-06 13:49:54'),
(39, 11, 374, 10, 1, '2026-01-06 13:49:54'),
(40, 11, 393, 5, 1, '2026-01-06 13:49:54'),
(41, 11, 394, 5, 1, '2026-01-06 13:49:54'),
(42, 11, 395, 5, 1, '2026-01-06 13:49:54'),
(43, 11, 399, 5, 1, '2026-01-06 13:49:54'),
(44, 11, 400, 5, 1, '2026-01-06 13:49:54'),
(45, 11, 387, 5, 1, '2026-01-06 13:49:54'),
(46, 11, 388, 5, 1, '2026-01-06 13:49:54'),
(47, 11, 405, 5, 0, '2026-01-06 13:49:54'),
(48, 11, 416, 5, 0, '2026-01-06 13:49:54');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `picture` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `role` enum('user','admin','super_admin') COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `has_completed_onboarding` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_email` (`email`),
  KEY `idx_active` (`is_active`,`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `google_id`, `email`, `password`, `name`, `picture`, `organization_id`, `role`, `has_completed_onboarding`, `is_active`, `last_login_at`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, '108416534730748820440', 'dev03@gorex.ai', NULL, 'Saisha Qandeel', NULL, NULL, 'super_admin', 1, 1, NULL, NULL, '2025-12-09 09:26:49', '2025-12-09 09:26:49'),
(2, NULL, 'bscs22f23@namal.edu.pk', '$2b$10$VBw7us7Ald2Qu2UaQG5SyeoJmcXtpYxhND2qwvYctoa.809Gwj/3e', 'waqas khan', '/uploads/picture-1768642364592-641649147.jpg', 1, 'admin', 1, 1, NULL, NULL, '2025-12-09 10:04:05', '2026-01-17 09:46:18'),
(6, NULL, 'bscs22f21@namal.edu.pk', '$2b$10$YAaOz3nsY6Ql4Uc2dT76SeYGh5NWy6aWYeC9LFgqgfhIYyXimCPRa', 'Ahmed Nisar', NULL, 4, 'admin', 1, 1, NULL, NULL, '2026-03-09 07:12:51', '2026-03-09 07:14:38'),
(7, NULL, 'bscs22f20@namal.edu.pk', '$2b$10$HKSZigrmhAp/u8fvhmO1UOxUWZhigeqpAepjZLGATxGkrN5BcEKXy', 'shaka', NULL, 7, 'admin', 1, 1, NULL, NULL, '2026-03-09 07:17:43', '2026-03-09 07:27:42');

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_template_details`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_template_details`;
CREATE TABLE IF NOT EXISTS `vw_template_details` (
`template_id` int(11)
,`template_name` varchar(255)
,`template_description` text
,`industry_type` varchar(100)
,`icon` varchar(255)
,`usage_count` int(11)
,`parameter_id` int(11)
,`parameter_name` varchar(255)
,`parameter_description` text
,`category` varchar(100)
,`weightage` int(11)
,`is_required` tinyint(1)
);

-- --------------------------------------------------------

--
-- Structure for view `vw_template_details`
--
DROP TABLE IF EXISTS `vw_template_details`;

DROP VIEW IF EXISTS `vw_template_details`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_template_details`  AS  select `mt`.`id` AS `template_id`,`mt`.`template_name` AS `template_name`,`mt`.`description` AS `template_description`,`mt`.`industry_type` AS `industry_type`,`mt`.`icon` AS `icon`,`mt`.`usage_count` AS `usage_count`,`p`.`id` AS `parameter_id`,`p`.`parameter_name` AS `parameter_name`,`p`.`description` AS `parameter_description`,`p`.`category` AS `category`,`tp`.`weightage` AS `weightage`,`tp`.`is_required` AS `is_required` from ((`matrix_templates` `mt` join `template_parameters` `tp` on((`mt`.`id` = `tp`.`template_id`))) join `parameters` `p` on((`tp`.`parameter_id` = `p`.`id`))) where (`mt`.`is_active` = 1) order by `mt`.`id`,`tp`.`weightage` desc ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `evaluations`
--
ALTER TABLE `evaluations`
  ADD CONSTRAINT `fk_evaluations_rating` FOREIGN KEY (`rating_id`) REFERENCES `performance_ratings` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `evaluation_cycles`
--
ALTER TABLE `evaluation_cycles`
  ADD CONSTRAINT `fk_cycle_lm_matrix` FOREIGN KEY (`line_manager_matrix_id`) REFERENCES `performance_matrices` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `performance_ratings`
--
ALTER TABLE `performance_ratings`
  ADD CONSTRAINT `performance_ratings_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `team_reminders`
--
ALTER TABLE `team_reminders`
  ADD CONSTRAINT `fk_reminder_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `cycle_team_assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reminder_line_manager` FOREIGN KEY (`line_manager_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `template_parameters`
--
ALTER TABLE `template_parameters`
  ADD CONSTRAINT `fk_tp_parameter` FOREIGN KEY (`parameter_id`) REFERENCES `parameters` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tp_template` FOREIGN KEY (`template_id`) REFERENCES `matrix_templates` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
