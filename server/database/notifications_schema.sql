-- Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL COMMENT 'Employee ID who receives the notification',
  `sender_id` int(11) DEFAULT NULL COMMENT 'Employee ID who triggered the notification (optional)',
  `notification_type` enum(
    'team_assignment',
    'evaluation_submitted',
    'manager_completion',
    'admin_reminder',
    'deadline_reminder',
    'cycle_activation',
    'cycle_closure'
  ) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL COMMENT 'Additional data like cycle_id, team_id, evaluation_id, etc.',
  `action_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Link to relevant page',
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipient` (`recipient_id`),
  KEY `idx_organization` (`organization_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_type` (`notification_type`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_recipient_read` (`recipient_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification Preferences Table (optional for future enhancement)
CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_employee_type` (`employee_id`, `notification_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for better query performance
CREATE INDEX idx_notification_lookup ON notifications(recipient_id, is_read, created_at DESC);
