CREATE TABLE `blocklist` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`reason` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blocklist_unique` ON `blocklist` (`type`,`value`);--> statement-breakpoint
CREATE TABLE `courier_check_cache` (
	`phone` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`checked_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `order` ADD `risk_score` integer;--> statement-breakpoint
ALTER TABLE `order` ADD `risk_flags` text;