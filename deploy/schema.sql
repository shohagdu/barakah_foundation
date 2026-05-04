-- ============================================================
-- Barakah Musharkah Foundation — Database Schema
-- Import: mysql -u DB_USER -p DB_NAME < schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100) NOT NULL,
    `email`      VARCHAR(150) NOT NULL UNIQUE,
    `password`   VARCHAR(255) NOT NULL,
    `mobile`     VARCHAR(20)  DEFAULT NULL,
    `role`       ENUM('admin','accountant','member','viewer') NOT NULL DEFAULT 'member',
    `status`     ENUM('active','inactive','suspended')        NOT NULL DEFAULT 'active',
    `last_login` DATETIME     DEFAULT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Members ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `members` (
    `id`        BIGINT          NOT NULL AUTO_INCREMENT,
    `name`      VARCHAR(100)    NOT NULL,
    `phone`     VARCHAR(20)     NOT NULL,
    `email`     VARCHAR(150)    DEFAULT NULL,
    `address`   TEXT            DEFAULT NULL,
    `category`  VARCHAR(50)     DEFAULT NULL,
    `status`    VARCHAR(20)     DEFAULT 'active',
    `join_date` DATE            DEFAULT NULL,
    `fee`       DECIMAL(10,2)   DEFAULT NULL,
    `notes`     TEXT            DEFAULT NULL,
    `created_at` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Bank Accounts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bank_accounts` (
    `id`             BIGINT       NOT NULL AUTO_INCREMENT,
    `bank_name`      VARCHAR(100) DEFAULT NULL,
    `account_name`   VARCHAR(100) DEFAULT NULL,
    `account_number` VARCHAR(50)  DEFAULT NULL,
    `branch`         VARCHAR(100) DEFAULT NULL,
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Chart of Accounts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `chart_of_accounts` (
    `id`         BIGINT      NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100) NOT NULL,
    `type`       VARCHAR(50)  DEFAULT NULL,   -- asset, liability, income, expense
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default accounts required by the application
INSERT IGNORE INTO `chart_of_accounts` (`id`, `name`, `type`) VALUES
(1, 'Cash',        'asset'),
(2, 'Bank',        'asset'),
(3, 'Member Fund', 'liability');

-- ── Transactions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `bank_account_id` BIGINT       DEFAULT NULL,
    `txn_date`        DATE         NOT NULL,
    `description`     TEXT         DEFAULT NULL,
    `reference`       VARCHAR(100) DEFAULT NULL,
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_txn_bank` (`bank_account_id`),
    CONSTRAINT `fk_txn_bank` FOREIGN KEY (`bank_account_id`)
        REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Transaction Lines (double-entry) ──────────────────────────
CREATE TABLE IF NOT EXISTS `transaction_lines` (
    `id`             BIGINT        NOT NULL AUTO_INCREMENT,
    `transaction_id` BIGINT        NOT NULL,
    `account_id`     BIGINT        NOT NULL,
    `debit`          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `credit`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    KEY `fk_tl_txn`     (`transaction_id`),
    KEY `fk_tl_account` (`account_id`),
    CONSTRAINT `fk_tl_txn` FOREIGN KEY (`transaction_id`)
        REFERENCES `transactions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tl_account` FOREIGN KEY (`account_id`)
        REFERENCES `chart_of_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Member Deposits (monthly subscriptions) ───────────────────
CREATE TABLE IF NOT EXISTS `member_deposits` (
    `id`             BIGINT        NOT NULL AUTO_INCREMENT,
    `member_id`      BIGINT        NOT NULL,
    `transaction_id` BIGINT        DEFAULT NULL,
    `deposit_month`  VARCHAR(7)    NOT NULL,   -- "2026-03"
    `deposit_date`   DATE          NOT NULL,
    `amount`         DECIMAL(10,2) NOT NULL,
    `status`         ENUM('paid','unpaid','partial','pending','approved') NOT NULL DEFAULT 'paid',
    `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_dep_member` (`member_id`),
    KEY `fk_dep_txn`    (`transaction_id`),
    CONSTRAINT `fk_dep_member` FOREIGN KEY (`member_id`)
        REFERENCES `members` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_dep_txn` FOREIGN KEY (`transaction_id`)
        REFERENCES `transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Donations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `donations` (
    `id`         BIGINT        NOT NULL AUTO_INCREMENT,
    `donor`      VARCHAR(100)  NOT NULL,
    `phone`      VARCHAR(20)   DEFAULT NULL,
    `address`    TEXT          DEFAULT NULL,
    `amount`     DECIMAL(10,2) NOT NULL,
    `date`       DATE          NOT NULL,
    `don_type`   VARCHAR(50)   DEFAULT NULL,
    `project_id` BIGINT        DEFAULT NULL,
    `notes`      TEXT          DEFAULT NULL,
    `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_don_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Projects ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `projects` (
    `id`          BIGINT        NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(150)  NOT NULL,
    `description` TEXT          DEFAULT NULL,
    `budget`      DECIMAL(12,2) DEFAULT NULL,
    `spent`       DECIMAL(12,2) DEFAULT NULL,
    `status`      VARCHAR(30)   DEFAULT 'active',
    `start_date`  DATE          DEFAULT NULL,
    `end_date`    DATE          DEFAULT NULL,
    `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK on donations.project_id now that projects table exists
ALTER TABLE `donations`
    ADD CONSTRAINT `fk_don_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL;

-- ── Beneficiaries ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `beneficiaries` (
    `id`          BIGINT        NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)  NOT NULL,
    `phone`       VARCHAR(20)   DEFAULT NULL,
    `address`     TEXT          DEFAULT NULL,
    `category`    VARCHAR(50)   DEFAULT NULL,
    `status`      VARCHAR(20)   DEFAULT 'active',
    `monthly_aid` DECIMAL(10,2) DEFAULT NULL,
    `join_date`   DATE          DEFAULT NULL,
    `notes`       TEXT          DEFAULT NULL,
    `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Meetings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `meetings` (
    `id`        BIGINT       NOT NULL AUTO_INCREMENT,
    `title`     VARCHAR(200) NOT NULL,
    `date`      DATE         NOT NULL,
    `time`      TIME         DEFAULT NULL,
    `venue`     VARCHAR(200) DEFAULT NULL,
    `mt_type`   VARCHAR(50)  DEFAULT NULL,
    `status`    VARCHAR(30)  DEFAULT 'scheduled',
    `attendees` TEXT         DEFAULT NULL,
    `agenda`    TEXT         DEFAULT NULL,
    `minutes`   TEXT         DEFAULT NULL,
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Default admin user ────────────────────────────────────────
-- Password: Admin@1234  (bcrypt hash — change after first login!)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`)
VALUES (
    1,
    'Administrator',
    'admin@barakah.org',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGTfPaREHRlqNj/6.p1NhVd4Xeu',
    'admin',
    'active'
);
