CREATE TABLE `edit_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportRequestId` int NOT NULL,
	`userId` int NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`editType` enum('create','update','delete','assign','status_change') NOT NULL DEFAULT 'update',
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `edit_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','owner','office','sales_rep','project_manager','team_lead') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `teamLeadId` int;