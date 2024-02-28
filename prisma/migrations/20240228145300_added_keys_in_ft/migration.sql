-- AlterTable
ALTER TABLE `fees_transaction` ADD COLUMN `order_id` VARCHAR(191) NULL,
    ADD COLUMN `payment_id` VARCHAR(191) NULL,
    ADD COLUMN `pg_gateway` VARCHAR(191) NULL;
