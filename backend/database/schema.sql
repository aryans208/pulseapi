-- ============================================================================
-- PulseAPI Database Schema (MySQL 8.0+)
-- Production-ready schema for API Monitoring, Incident Tracking & Status Pages
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Monitors Table
CREATE TABLE IF NOT EXISTS `monitors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `url` TEXT NOT NULL,
  `method` ENUM('GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH') DEFAULT 'GET',
  `check_interval` INT DEFAULT 1 COMMENT 'Interval in minutes (e.g., 1, 5, 10, 15, 30, 60)',
  `timeout_ms` INT DEFAULT 5000 COMMENT 'Timeout limit in milliseconds',
  `expected_status` INT DEFAULT 200 COMMENT 'Expected HTTP status code',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT 'Whether the monitor is active or paused',
  `status` ENUM('up', 'down', 'paused', 'pending') DEFAULT 'pending',
  `uptime_percentage` DECIMAL(5, 2) DEFAULT 100.00,
  `last_checked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_monitors_user_status` (`user_id`, `status`),
  INDEX `idx_monitors_active` (`is_active`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Monitor Checks (Time-series log of all ping checks)
CREATE TABLE IF NOT EXISTS `monitor_checks` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `monitor_id` INT NOT NULL,
  `status_code` INT NULL COMMENT 'HTTP status code returned, or NULL on connection error',
  `response_time_ms` INT NOT NULL COMMENT 'Response latency in milliseconds',
  `is_up` BOOLEAN NOT NULL COMMENT 'True if status code matches expected status and no network error',
  `error_message` TEXT NULL COMMENT 'Descriptive error message when check fails',
  `checked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON DELETE CASCADE,
  INDEX `idx_checks_monitor_time` (`monitor_id`, `checked_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Incidents Table (Downtime events and recovery tracking)
CREATE TABLE IF NOT EXISTS `incidents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `monitor_id` INT NOT NULL,
  `cause` TEXT NOT NULL COMMENT 'Root cause / error details triggering the incident',
  `status` ENUM('investigating', 'identified', 'monitoring', 'resolved') DEFAULT 'investigating',
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL,
  `duration_seconds` INT NULL COMMENT 'Calculated duration in seconds once resolved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON DELETE CASCADE,
  INDEX `idx_incidents_monitor_status` (`monitor_id`, `status`),
  INDEX `idx_incidents_started` (`started_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Status Pages Table
CREATE TABLE IF NOT EXISTS `status_pages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `is_public` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_status_pages_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Status Page Monitors (Many-to-Many junction table)
CREATE TABLE IF NOT EXISTS `status_page_monitors` (
  `status_page_id` INT NOT NULL,
  `monitor_id` INT NOT NULL,
  `display_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`status_page_id`, `monitor_id`),
  FOREIGN KEY (`status_page_id`) REFERENCES `status_pages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
