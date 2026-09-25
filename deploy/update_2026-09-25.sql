-- Production update: run once in phpMyAdmin (safe to re-run).
-- Includes migrations 002 + 003.

-- Income module: categories + income entries.
-- On approval an income posts a double-entry transaction:
--   DEBIT  Cash (1001) / Bank (1002)   ← where the money was received
--   CREDIT income account (account_id) ← chart-of-accounts account of type 'income'

CREATE TABLE IF NOT EXISTS `income_categories` (
  `id`         int NOT NULL AUTO_INCREMENT,
  `name`       varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_bn`    varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_id`  int DEFAULT NULL,
  `account_id` int DEFAULT NULL,
  `is_active`  tinyint DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incomes` (
  `id`               int NOT NULL AUTO_INCREMENT,
  `income_date`      date NOT NULL,
  `category`         varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source`           varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description`      text COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount`           decimal(12,2) NOT NULL,
  `payment_method`   enum('cash','bank','mobile_banking') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `bank_account_id`  int DEFAULT NULL,
  `account_id`       int NOT NULL,
  `transaction_id`   bigint DEFAULT NULL,
  `approved_by`      int DEFAULT NULL,
  `status`           enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `receipt_image`    varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference`        varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes`            text COLLATE utf8mb4_unicode_ci,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `created_by`       int NOT NULL DEFAULT '1',
  `created_at`       timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_incomes_date`   (`income_date`),
  KEY `idx_incomes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed categories only on an empty table; link to existing income accounts by code.
INSERT INTO `income_categories` (`name`, `name_bn`, `account_id`)
SELECT * FROM (
  SELECT 'Donation'          AS name, 'দান / অনুদান'     AS name_bn, NULL AS account_id UNION ALL
  SELECT 'Investment Profit',         'বিনিয়োগ মুনাফা',  (SELECT id FROM accounts WHERE account_code = '4001' LIMIT 1) UNION ALL
  SELECT 'Late Fee',                  'বিলম্ব ফি',        (SELECT id FROM accounts WHERE account_code = '4002' LIMIT 1) UNION ALL
  SELECT 'Bank Profit',               'ব্যাংক মুনাফা',     NULL UNION ALL
  SELECT 'Rent Income',               'ভাড়া আয়',         NULL UNION ALL
  SELECT 'Miscellaneous',             'বিবিধ আয়',        NULL
) seed
WHERE NOT EXISTS (SELECT 1 FROM `income_categories`);

-- Give every income category a default income account.
-- Creates the missing income accounts (4004–4007) and links categories that have none.
-- Safe to re-run: skips existing account codes and never overwrites a category's chosen account.

INSERT INTO `accounts` (`account_code`, `type`, `category`, `description`)
SELECT seed.code, 'income', seed.name, seed.name_bn FROM (
  SELECT '4004' AS code, 'Donation Income'      AS name, 'দান / অনুদান আয়' AS name_bn UNION ALL
  SELECT '4005',         'Bank Profit',                  'ব্যাংক মুনাফা'           UNION ALL
  SELECT '4006',         'Rent Income',                  'ভাড়া আয়'                UNION ALL
  SELECT '4007',         'Miscellaneous Income',         'বিবিধ আয়'
) seed
WHERE NOT EXISTS (SELECT 1 FROM `accounts` a WHERE a.account_code = seed.code);

UPDATE `income_categories` c
JOIN (
  SELECT 'Donation'          AS name, '4004' AS code UNION ALL
  SELECT 'Investment Profit',         '4001'         UNION ALL
  SELECT 'Late Fee',                  '4002'         UNION ALL
  SELECT 'Bank Profit',               '4005'         UNION ALL
  SELECT 'Rent Income',               '4006'         UNION ALL
  SELECT 'Miscellaneous',             '4007'
) m ON m.name = c.name
JOIN `accounts` a ON a.account_code = m.code AND a.type = 'income'
SET c.account_id = a.id
WHERE c.account_id IS NULL;
