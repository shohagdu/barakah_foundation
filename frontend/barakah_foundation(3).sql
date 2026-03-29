-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 29, 2026 at 02:43 AM
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
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `date`, `account_code`, `type`, `category`, `description`, `amount`, `notes`, `created_at`, `updated_at`) VALUES
(1, '2026-03-28', '1001', 'asset', 'Cash', '-', '0.00', NULL, '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(2, '2026-03-28', '1002', 'asset', 'Bank', '-', '0.00', NULL, '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(3, '2026-03-28', '2001', 'liability', 'Member Fund', '-', '0.00', NULL, '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(4, '2026-03-28', '3001', 'equity', 'Retained Earnings', '-', '0.00', NULL, '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(5, '2026-03-28', '4001', 'income', 'Investment Profit', '-', '0.00', NULL, '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(6, '2026-03-28', '5001', 'expense', 'Office Expense', '-', '0.00', NULL, '2026-03-28 05:42:41', '2026-03-28 05:42:41'),
(7, '2026-03-28', '4002', 'income', 'Late Fee Income', '-', '0.00', NULL, '2026-03-28 05:47:24', '2026-03-28 05:48:00'),
(8, '2026-03-28', NULL, 'income', 'চাঁদা', 'ফারহানা বেগম — মাসিক চাঁদা মার্চ 2026', '5000.00', 'tes', '2026-03-28 17:04:40', '2026-03-28 17:04:40');

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

-- --------------------------------------------------------

--
-- Table structure for table `bank_accounts`
--

CREATE TABLE `bank_accounts` (
  `id` bigint NOT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bank_accounts`
--

INSERT INTO `bank_accounts` (`id`, `bank_name`, `account_name`, `account_number`, `created_at`) VALUES
(1, 'Soanli Bank', 'Brakah Found', '45000', '2026-03-28 06:00:59');

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

--
-- Dumping data for table `beneficiaries`
--

INSERT INTO `beneficiaries` (`id`, `name`, `phone`, `address`, `category`, `status`, `monthly_aid`, `join_date`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'করিমুন্নেসা', '01900000001', 'মিরপুর, ঢাকা', 'food', 'active', '2000.00', NULL, 'বিধবা, ৩ সন্তান', '2026-03-27 05:19:27', '2026-03-27 05:19:27'),
(2, 'মো. শরিফুল হক', '01900000002', 'কমলাপুর, ঢাকা', 'education', 'active', '1500.00', NULL, 'এতিম শিক্ষার্থী', '2026-03-27 05:19:27', '2026-03-27 05:19:27');

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

--
-- Dumping data for table `donations`
--

INSERT INTO `donations` (`id`, `donor`, `phone`, `address`, `amount`, `date`, `type`, `project_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'হাজী মো. রফিকুল ইসলাম', '01712000001', NULL, '25000.00', '2024-06-01', 'general', NULL, 'রমজান উপলক্ষে', '2026-03-27 05:19:27', '2026-03-27 05:19:27'),
(2, 'মিসেস সাবরিনা খানম', '01712000002', NULL, '5000.00', '2024-06-10', 'zakat', NULL, '', '2026-03-27 05:19:27', '2026-03-27 05:19:27');

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

--
-- Dumping data for table `meetings`
--

INSERT INTO `meetings` (`id`, `title`, `date`, `time`, `venue`, `type`, `status`, `attendees`, `agenda`, `minutes`, `created_at`, `updated_at`) VALUES
(1, 'মাসিক সাধারণ সভা', '2024-06-15', '10:00:00', 'ফাউন্ডেশন অফিস', 'general', 'completed', '১৫ জন', 'বাজেট পর্যালোচনা, প্রকল্প আপডেট', 'বাজেট অনুমোদিত', '2026-03-27 05:19:27', '2026-03-27 05:19:27'),
(2, 'কমিটি বৈঠক', '2024-07-01', '14:00:00', 'অনলাইন (জুম)', 'committee', 'upcoming', '', 'নতুন প্রকল্প প্রস্তাব', '', '2026-03-27 05:19:27', '2026-03-27 05:19:27');

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` bigint NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

INSERT INTO `members` (`id`, `image`, `name`, `phone`, `email`, `address`, `category`, `status`, `join_date`, `fee`, `notes`, `nid_number`, `nid_attachment`, `nominee_image`, `nominee_name`, `nominee_mobile`, `nominee_address`, `created_at`, `created_by`, `created_ip`, `updated_by`, `updated_ip`, `updated_at`) VALUES
(1, NULL, 'মো. আবদুল করিম', '01711000001', NULL, 'ঢাকা', 'general', 'active', '2024-01-01', '5000.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27 05:19:27', NULL, NULL, NULL, NULL, '2026-03-28 11:52:07'),
(2, NULL, 'ফারহানা বেগম', '01711000002', NULL, 'চট্টগ্রাম', 'Presedent', 'active', '2024-02-15', '5000.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27 05:19:27', NULL, NULL, NULL, NULL, '2026-03-28 11:51:54');

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
  `status` enum('paid','unpaid') COLLATE utf8mb4_unicode_ci DEFAULT 'paid',
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
(1, 2, NULL, '2026', '5000.00', '2026-03-28', 'paid', '2026-03-28 17:36:00', NULL, NULL, NULL, NULL, NULL),
(2, 2, NULL, '2026', '5000.00', '2026-03-28', 'paid', '2026-03-28 17:36:32', NULL, NULL, NULL, NULL, NULL),
(3, 2, NULL, NULL, '5000.00', NULL, 'paid', '2026-03-28 17:38:49', NULL, NULL, NULL, NULL, NULL),
(4, 2, NULL, NULL, '5000.00', NULL, 'paid', '2026-03-28 17:40:27', NULL, NULL, NULL, NULL, NULL),
(5, 2, NULL, NULL, '5000.00', NULL, 'paid', '2026-03-28 17:41:53', NULL, NULL, NULL, NULL, NULL),
(6, 2, NULL, NULL, '5000.00', NULL, 'paid', '2026-03-28 17:44:09', NULL, NULL, NULL, NULL, NULL),
(7, 2, NULL, NULL, '5000.00', NULL, 'paid', '2026-03-28 18:11:02', NULL, NULL, NULL, NULL, NULL),
(8, 2, NULL, NULL, '5000.00', NULL, 'paid', '2026-03-28 18:11:37', NULL, NULL, NULL, NULL, NULL);

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

--
-- Dumping data for table `member_fines`
--

INSERT INTO `member_fines` (`id`, `transaction_id`, `member_id`, `fine_amount`, `reason`, `status`, `fine_date`, `created_by`, `created_ip`, `created_time`, `updated_by`, `updated_time`, `updated_ip`) VALUES
(1, NULL, 1, '100.00', 'Late deposit fine', 'unpaid', '2026-03-27', NULL, NULL, NULL, NULL, NULL, NULL);

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

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `name`, `description`, `budget`, `spent`, `status`, `start_date`, `end_date`, `created_at`, `updated_at`) VALUES
(1, 'রমজান ফুড প্যাকেজ ২০২৪', 'অসহায় পরিবারকে খাদ্য সহায়তা', '50000.00', '12000.00', 'active', '2024-03-01', '2024-04-15', '2026-03-27 05:19:27', '2026-03-27 05:19:27'),
(2, 'শিক্ষাবৃত্তি প্রকল্প', 'মেধাবী শিক্ষার্থীদের বৃত্তি', '100000.00', '35000.00', 'active', '2026-03-27', NULL, '2026-03-27 05:19:27', '2026-03-27 05:32:02');

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
(5, 1, '2026-03-28', 'Deposit from Member 1', 'DEP-001', '2026-03-28 06:01:06', NULL, NULL);

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
(4, 5, 2, '5000.00', '0.00'),
(5, 5, 3, '0.00', '5000.00');

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
(2, 'omar', 'omar@gmail.com', '$2b$12$UB8ugpwinK2ikUBhuuWr3OEqd1vWfZNCd13TLOEv6C6g7swXuEtPW', '01839707645', 'admin', 'active', '2026-03-28 16:02:38', '2026-03-27 05:28:35', '2026-03-28 16:02:37');

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
-- Indexes for table `donations`
--
ALTER TABLE `donations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_donation_project` (`project_id`);

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `beneficiaries`
--
ALTER TABLE `beneficiaries`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `donations`
--
ALTER TABLE `donations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `member_deposits`
--
ALTER TABLE `member_deposits`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `member_fines`
--
ALTER TABLE `member_fines`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `transaction_lines`
--
ALTER TABLE `transaction_lines`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

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
