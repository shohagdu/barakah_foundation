-- Update member_deposits table to add new status values for approval workflow
ALTER TABLE `member_deposits` 
MODIFY COLUMN `status` ENUM('paid','unpaid','partial','pending','approved') NOT NULL DEFAULT 'paid';
