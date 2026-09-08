-- Add voucher fields to orders for post-order voucher + QR
ALTER TABLE `order` ADD COLUMN `voucher_number` text;
CREATE UNIQUE INDEX `order_voucher_number_unique` ON `order` (`voucher_number`);
ALTER TABLE `order` ADD COLUMN `voucher_qr_key` text;
