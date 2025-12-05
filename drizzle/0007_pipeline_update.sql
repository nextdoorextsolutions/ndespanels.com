-- First add new columns that don't require enum changes
ALTER TABLE `report_requests` ADD `dealType` enum('insurance','cash','financed');--> statement-breakpoint
ALTER TABLE `report_requests` ADD `projectCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `lienRightsStatus` enum('not_applicable','active','warning','critical','expired','legal') DEFAULT 'not_applicable';--> statement-breakpoint
ALTER TABLE `report_requests` ADD `lienRightsExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `lastLienRightsNotification` timestamp;--> statement-breakpoint

-- First expand the enum to include all values (old and new)
ALTER TABLE `report_requests` MODIFY COLUMN `status` enum('lead','appointment_set','prospect','approved','project_scheduled','completed','invoiced','lien_legal','closed_deal','closed_lost','pending','new_lead','contacted','inspection_scheduled','inspection_complete','report_sent','follow_up','closed_won','cancelled') NOT NULL DEFAULT 'lead';--> statement-breakpoint

-- Migrate old status values to new ones
UPDATE `report_requests` SET `status` = 'lead' WHERE `status` IN ('pending', 'new_lead', 'contacted');--> statement-breakpoint
UPDATE `report_requests` SET `status` = 'prospect' WHERE `status` IN ('inspection_scheduled', 'inspection_complete');--> statement-breakpoint
UPDATE `report_requests` SET `status` = 'invoiced' WHERE `status` IN ('report_sent', 'follow_up');--> statement-breakpoint
UPDATE `report_requests` SET `status` = 'closed_deal' WHERE `status` = 'closed_won';--> statement-breakpoint
UPDATE `report_requests` SET `status` = 'closed_lost' WHERE `status` = 'cancelled';
