ALTER TABLE `report_requests` ADD `roofConcerns` text;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `handsOnInspection` boolean DEFAULT false NOT NULL;