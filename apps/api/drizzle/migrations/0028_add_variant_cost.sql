-- Add cost column to product_variant for per-variant profit tracking
ALTER TABLE `product_variant` ADD COLUMN `cost` integer;
