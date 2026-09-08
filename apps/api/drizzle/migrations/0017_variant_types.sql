-- Variant Types: groups like "Color", "Size", "Storage" per product
CREATE TABLE `variant_type` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'custom' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `variant_type_product_idx` ON `variant_type` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `variant_type_product_name_idx` ON `variant_type` (`product_id`, `name`);--> statement-breakpoint
-- Variant Options: individual options within a variant type group
CREATE TABLE `variant_option` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_type_id` text NOT NULL,
	`name` text NOT NULL,
	`value` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`variant_type_id`) REFERENCES `variant_type`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `variant_option_type_idx` ON `variant_option` (`variant_type_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `variant_option_type_name_idx` ON `variant_option` (`variant_type_id`, `name`);
