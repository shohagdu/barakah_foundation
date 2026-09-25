-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 10, 2026 at 02:57 AM
-- Server version: 8.0.45-0ubuntu0.22.04.1
-- PHP Version: 8.1.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `barakah_foundation`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int NOT NULL,
  `date` date DEFAULT NULL,
  `account_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('asset','liability','equity','income','expense') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `date`, `account_code`, `type`, `category`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, '2026-03-28', '1001', 'asset', 'Cash', '-', 'pending', '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(2, '2026-03-28', '1002', 'asset', 'Bank', '-', 'pending', '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(3, '2026-03-28', '2001', 'liability', 'Member Fund', '-', 'pending', '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(4, '2026-03-28', '3001', 'equity', 'Retained Earnings', '-', 'pending', '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(5, '2026-03-28', '4001', 'income', 'Investment Profit', '-', 'pending', '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(6, '2026-03-28', '5001', 'expense', 'Office Expense', '-', 'pending', '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(7, '2026-03-28', '4002', 'income', 'Late Fee Income', '-', 'pending', '2026-03-28 05:47:24', '2026-03-28 05:48:00'),
(8, '2026-03-28', '4003', 'income', 'চাঁদা', '', 'pending', '2026-03-28 17:04:40', '2026-05-02 07:55:53'),
(9, NULL, '2002', 'liability', 'Special Collection Fund', 'বিশেষ সংগ্রহ তহবিল', 'pending', '2026-05-02 17:46:53', '2026-05-02 17:46:53'),
(10, NULL, '2003', 'liability', 'Project Collection Fund', 'প্রকল্প সংগ্রহ তহবিল', 'pending', '2026-05-02 17:46:53', '2026-05-02 17:46:53'),
(11, NULL, '1003', 'asset', 'Project Asset', 'প্রকল্প সম্পদ', 'approved', '2026-05-02 17:46:53', '2026-05-08 03:53:57');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `table_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_value` text COLLATE utf8mb4_unicode_ci,
  `new_value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `action`, `table_name`, `old_value`, `new_value`, `created_at`) VALUES
(1, 'CREATE', 'expenses', NULL, 'expense #1: Office Expense - Printer paper', '2026-05-02 17:37:20'),
(2, 'APPROVE', 'expenses', NULL, 'Approved expense #1, transaction #9 created', '2026-05-02 17:37:20'),
(3, 'CREATE', 'expenses', NULL, 'expense #2: Maintenance - 4', '2026-05-02 17:58:56'),
(4, 'UPDATE', 'expenses', NULL, 'Updated expense #2', '2026-05-03 14:23:11'),
(5, 'CREATE', 'expenses', NULL, 'expense #3: Miscellaneous - sdfasf', '2026-05-03 14:24:06'),
(6, 'APPROVE', 'expenses', NULL, 'Approved expense #3, transaction #10 created', '2026-05-03 14:27:20'),
(7, 'APPROVE', 'expenses', NULL, 'Approved expense #2, transaction #11 created', '2026-05-03 14:27:23'),
(8, 'CREATE', 'expenses', NULL, 'expense #4: Miscellaneous - 11', '2026-05-03 15:07:11'),
(9, 'APPROVE', 'expenses', NULL, 'Approved expense #4, transaction #12 created', '2026-05-03 15:07:17'),
(10, 'CREATE', 'expenses', NULL, 'expense #5: Miscellaneous - tes', '2026-05-03 15:10:17'),
(11, 'APPROVE', 'expenses', NULL, 'Approved expense #5, transaction #13 created', '2026-05-03 15:10:22');

-- --------------------------------------------------------

--
-- Table structure for table `bank_accounts`
--

CREATE TABLE `bank_accounts` (
  `id` bigint NOT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `routing_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bank_accounts`
--

INSERT INTO `bank_accounts` (`id`, `bank_name`, `account_name`, `account_number`, `branch_name`, `routing_number`, `is_active`, `is_deleted`, `created_at`) VALUES
(1, 'Soanli Bank', 'Brakah Found', '45000', NULL, NULL, 1, 0, '2026-03-28 06:00:59');

-- --------------------------------------------------------

--
-- Table structure for table `beneficiaries`
--

CREATE TABLE `beneficiaries` (
  `id` int NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `category` enum('food','education','medical','shelter','other') COLLATE utf8mb4_unicode_ci DEFAULT 'food',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `monthly_aid` decimal(12,2) DEFAULT '0.00',
  `join_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `collections`
--

CREATE TABLE `collections` (
  `id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title_bn` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` enum('general','project') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `project_id` int DEFAULT NULL,
  `target_amount` decimal(12,2) DEFAULT '0.00',
  `collected_amount` decimal(12,2) DEFAULT '0.00',
  `per_member_amount` decimal(12,2) DEFAULT NULL,
  `collection_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `account_id` int NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `collections`
--

INSERT INTO `collections` (`id`, `title`, `title_bn`, `description`, `type`, `project_id`, `target_amount`, `collected_amount`, `per_member_amount`, `collection_date`, `due_date`, `status`, `account_id`, `created_by`, `created_at`, `updated_at`) VALUES
(2, '2asdfasf', '2asdfasf', NULL, 'general', NULL, '2.00', '2.00', '2.00', '2026-05-04', NULL, 'completed', 9, 2, '2026-05-04 17:15:28', '2026-05-04 17:15:28');

-- --------------------------------------------------------

--
-- Table structure for table `collection_members`
--

CREATE TABLE `collection_members` (
  `id` bigint NOT NULL,
  `collection_id` int NOT NULL,
  `member_id` bigint NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('pending','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `paid_date` date DEFAULT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'cash'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `collection_members`
--

INSERT INTO `collection_members` (`id`, `collection_id`, `member_id`, `amount`, `status`, `paid_date`, `transaction_id`, `notes`, `created_at`, `payment_method`) VALUES
(2, 2, 3, '2.00', 'paid', '2026-05-04', 15, NULL, '2026-05-04 17:15:28', 'bank');

-- --------------------------------------------------------

--
-- Table structure for table `donations`
--

CREATE TABLE `donations` (
  `id` int NOT NULL,
  `donor` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `date` date NOT NULL,
  `type` enum('general','zakat','sadaqah','project') COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `project_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('cash','bank','mobile_banking') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `bank_account_id` int DEFAULT NULL,
  `account_id` int NOT NULL DEFAULT '1',
  `approved_by` int DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `receipt_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `expense_date`, `category`, `sub_category`, `description`, `amount`, `payment_method`, `bank_account_id`, `account_id`, `approved_by`, `status`, `receipt_image`, `reference`, `notes`, `rejection_reason`, `created_by`, `created_at`, `updated_at`) VALUES
(5, '2026-05-03', 'Miscellaneous', NULL, 'tes', '100.00', 'bank', 1, 1, 2, 'approved', NULL, '1', '1', NULL, 2, '2026-05-03 15:10:17', '2026-05-03 15:10:22');

-- --------------------------------------------------------

--
-- Table structure for table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_bn` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `account_id` int DEFAULT NULL,
  `is_active` tinyint DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `name`, `name_bn`, `parent_id`, `account_id`, `is_active`) VALUES
(1, 'Office Expense', 'অফিস খরচ', NULL, NULL, 1),
(2, 'Utility Bills', 'ইউটিলিটি বিল', NULL, NULL, 1),
(3, 'Salary', 'বেতন', NULL, NULL, 1),
(4, 'Travel', 'যাতায়াত', NULL, NULL, 1),
(5, 'Welfare', 'কল্যাণ খরচ', NULL, NULL, 1),
(6, 'Maintenance', 'রক্ষণাবেক্ষণ', NULL, NULL, 1),
(7, 'Miscellaneous', 'বিবিধ খরচ', NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `investments`
--

CREATE TABLE `investments` (
  `id` bigint NOT NULL,
  `bank_account_id` bigint DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('land','shop','stock','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_amount` decimal(14,2) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `status` enum('active','sold') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `created_ip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `updated_ip` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `investment_transactions`
--

CREATE TABLE `investment_transactions` (
  `id` bigint NOT NULL,
  `investment_id` bigint DEFAULT NULL,
  `txn_type` enum('buy','sell') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(14,2) DEFAULT NULL,
  `txn_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `meetings`
--

CREATE TABLE `meetings` (
  `id` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `time` time DEFAULT NULL,
  `venue` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('general','committee','emergency','agm') COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `status` enum('upcoming','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'upcoming',
  `attendees` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agenda` text COLLATE utf8mb4_unicode_ci,
  `minutes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` bigint NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_eng` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `category` enum('general','Presedent','Treasure') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `status` enum('active','inactive','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `join_date` date DEFAULT NULL,
  `fee` decimal(12,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `nid_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nid_attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_nid_attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_address` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `created_ip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `updated_ip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`id`, `image`, `name_eng`, `name`, `phone`, `address`, `category`, `status`, `join_date`, `fee`, `notes`, `nid_number`, `nid_attachment`, `nominee_image`, `nominee_name`, `nominee_mobile`, `nominee_nid_attachment`, `nominee_address`, `created_at`, `created_by`, `created_ip`, `updated_by`, `updated_ip`, `updated_at`) VALUES
(1, NULL, NULL, 'মো. আবদুল করিম', '01711000001', 'ঢাকা', 'general', 'active', '2024-01-01', '5000.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27 05:19:27', NULL, NULL, NULL, NULL, '2026-03-28 11:52:07'),
(2, NULL, NULL, 'ফারহানা বেগম', '01711000002', 'চট্টগ্রাম', 'Presedent', 'active', '2024-02-15', '5000.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27 05:19:27', NULL, NULL, NULL, NULL, '2026-03-28 11:51:54'),
(3, NULL, 'Sumaiy', 'সুমা', '018397076888', 'Dhaka', 'general', 'active', '2026-05-02', '5000.00', 'Hello the world', '456212', '/uploads/774bc901-0e29-4968-b64c-0cd3dff08b42.pdf', '/uploads/34771ae4-4969-461d-b313-9c3a76494681.jpeg', 'Mr Omar', '01839707645', '/uploads/5f7116ad-ee61-4071-a745-1e732cdff50b.png', 'Dhaka', '2026-05-02 07:14:38', NULL, NULL, NULL, NULL, '2026-05-02 07:14:38');

-- --------------------------------------------------------

--
-- Table structure for table `member_deposits`
--

CREATE TABLE `member_deposits` (
  `id` bigint NOT NULL,
  `member_id` bigint DEFAULT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `deposit_month` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT '5000.00',
  `deposit_date` date DEFAULT NULL,
  `status` enum('paid','unpaid','partial','pending','approved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paid',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `created_ip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `updated_ip` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `member_deposits`
--

INSERT INTO `member_deposits` (`id`, `member_id`, `transaction_id`, `deposit_month`, `amount`, `deposit_date`, `status`, `created_at`, `created_by`, `created_ip`, `updated_by`, `updated_ip`, `updated_time`) VALUES
(1, 3, 7, '2026-05', '5000.00', '2026-05-02', 'paid', '2026-05-02 07:52:21', NULL, NULL, NULL, NULL, NULL),
(2, 2, 8, '2026-05', '5000.00', '2026-05-02', 'paid', '2026-05-02 08:34:17', NULL, NULL, NULL, NULL, NULL),
(6, 2, 16, '2026-05', '5000.00', '2026-05-04', 'paid', '2026-05-04 17:26:28', NULL, NULL, NULL, NULL, NULL),
(7, 3, 17, '2026-07', '5000.00', '2026-05-04', 'paid', '2026-05-04 18:00:41', NULL, NULL, NULL, NULL, NULL),
(8, 3, 22, '2026-09', '5000.00', '2026-05-04', 'paid', '2026-05-04 18:09:02', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `member_fines`
--

CREATE TABLE `member_fines` (
  `id` bigint NOT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `member_id` bigint DEFAULT NULL,
  `fine_amount` decimal(10,2) DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('unpaid','paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `fine_date` date DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_ip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_time` datetime DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL,
  `updated_ip` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `budget` decimal(14,2) DEFAULT '0.00',
  `spent` decimal(14,2) DEFAULT '0.00',
  `status` enum('active','completed','paused','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint NOT NULL,
  `bank_account_id` bigint DEFAULT NULL,
  `txn_date` date NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `created_ip` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `bank_account_id`, `txn_date`, `description`, `reference`, `created_at`, `created_by`, `created_ip`) VALUES
(7, 1, '2026-05-02', 'সুমা — মাসিক চাঁদা মে 2026', 'DEP-3-202606', '2026-05-02 07:52:21', NULL, NULL),
(8, 1, '2026-05-02', 'ফারহানা বেগম — মাসিক চাঁদা মে 2026', 'DEP-2-202605', '2026-05-02 08:34:17', NULL, NULL),
(13, 1, '2026-05-03', 'Expense: tes', NULL, '2026-05-03 15:10:22', 2, NULL),
(15, 1, '2026-05-04', '2asdfasf — সুমা', NULL, '2026-05-04 17:15:28', 2, NULL),
(16, 1, '2026-05-04', 'ফারহানা বেগম — মাসিক চাঁদা মে 2026', 'DEP-2-202605', '2026-05-04 17:26:28', NULL, NULL),
(17, 1, '2026-05-04', 'সুমা — মাসিক চাঁদা জুলাই 2026', 'DEP-3-202607', '2026-05-04 18:00:41', NULL, NULL),
(22, 1, '2026-05-04', 'সুমা — মাসিক চাঁদা সেপ্টেম্বর 2026', 'DEP-3-202609', '2026-05-04 18:09:02', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `transaction_lines`
--

CREATE TABLE `transaction_lines` (
  `id` bigint NOT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `account_id` bigint DEFAULT NULL,
  `debit` decimal(14,2) DEFAULT '0.00',
  `credit` decimal(14,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transaction_lines`
--

INSERT INTO `transaction_lines` (`id`, `transaction_id`, `account_id`, `debit`, `credit`) VALUES
(1, 7, 2, '5000.00', '0.00'),
(2, 7, 3, '0.00', '5000.00'),
(3, 8, 2, '5000.00', '0.00'),
(4, 8, 3, '0.00', '5000.00'),
(13, 13, 1, '100.00', '0.00'),
(14, 13, 2, '0.00', '100.00'),
(17, 15, 2, '2.00', '0.00'),
(18, 15, 9, '0.00', '2.00'),
(19, 16, 2, '5000.00', '0.00'),
(20, 16, 3, '0.00', '5000.00'),
(21, 17, 2, '5000.00', '0.00'),
(22, 17, 3, '0.00', '5000.00'),
(23, 22, 2, '5000.00', '0.00'),
(24, 22, 3, '0.00', '5000.00');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','accountant','member','viewer') COLLATE utf8mb4_unicode_ci DEFAULT 'member',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `mobile`, `role`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'admin@barakah.org', '$2b$12$UB8ugpwinK2ikUBhuuWr3OEqd1vWfZNCd13TLOEv6C6g7swXuEtPW', '01700000000', 'admin', 'active', '2026-03-27 06:48:01', '2026-03-27 05:19:28', '2026-03-27 06:48:01'),
(2, 'omar', 'omar@gmail.com', '$2b$12$UB8ugpwinK2ikUBhuuWr3OEqd1vWfZNCd13TLOEv6C6g7swXuEtPW', '01839707645', 'admin', 'active', '2026-05-08 03:50:17', '2026-03-27 05:28:35', '2026-05-08 03:50:16'),
(3, 'সুমা', 'suma@gmail.com', '$2b$12$Ym.zMlrxdwG4VoDUAIRsTuaZm9ehUPDRVcKzlvu1FX7fMy3ySmQ/m', '018397076888', 'member', 'active', '2026-05-08 03:54:28', '2026-05-02 07:14:39', '2026-05-08 03:54:28');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_code` (`account_code`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `beneficiaries`
--
ALTER TABLE `beneficiaries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `collections`
--
ALTER TABLE `collections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `collection_members`
--
ALTER TABLE `collection_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_col_mem` (`collection_id`,`member_id`);

--
-- Indexes for table `donations`
--
ALTER TABLE `donations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_donation_project` (`project_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `investments`
--
ALTER TABLE `investments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_account_id` (`bank_account_id`);

--
-- Indexes for table `investment_transactions`
--
ALTER TABLE `investment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `investment_id` (`investment_id`);

--
-- Indexes for table `meetings`
--
ALTER TABLE `meetings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `member_deposits`
--
ALTER TABLE `member_deposits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id` (`member_id`);

--
-- Indexes for table `member_fines`
--
ALTER TABLE `member_fines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id` (`member_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_account_id` (`bank_account_id`);

--
-- Indexes for table `transaction_lines`
--
ALTER TABLE `transaction_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `transaction_id` (`transaction_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `beneficiaries`
--
ALTER TABLE `beneficiaries`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `collections`
--
ALTER TABLE `collections`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `collection_members`
--
ALTER TABLE `collection_members`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `donations`
--
ALTER TABLE `donations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `investments`
--
ALTER TABLE `investments`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `investment_transactions`
--
ALTER TABLE `investment_transactions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `meetings`
--
ALTER TABLE `meetings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `member_deposits`
--
ALTER TABLE `member_deposits`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `member_fines`
--
ALTER TABLE `member_fines`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `transaction_lines`
--
ALTER TABLE `transaction_lines`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `collections`
--
ALTER TABLE `collections`
  ADD CONSTRAINT `collections_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `collections_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`),
  ADD CONSTRAINT `collections_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `donations`
--
ALTER TABLE `donations`
  ADD CONSTRAINT `fk_donation_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `investments`
--
ALTER TABLE `investments`
  ADD CONSTRAINT `investments_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`);

--
-- Constraints for table `investment_transactions`
--
ALTER TABLE `investment_transactions`
  ADD CONSTRAINT `investment_transactions_ibfk_1` FOREIGN KEY (`investment_id`) REFERENCES `investments` (`id`);

--
-- Constraints for table `member_deposits`
--
ALTER TABLE `member_deposits`
  ADD CONSTRAINT `member_deposits_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`);

--
-- Constraints for table `member_fines`
--
ALTER TABLE `member_fines`
  ADD CONSTRAINT `member_fines_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`);

--
-- Constraints for table `transaction_lines`
--
ALTER TABLE `transaction_lines`
  ADD CONSTRAINT `transaction_lines_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
