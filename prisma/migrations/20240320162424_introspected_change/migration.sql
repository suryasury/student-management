/*
  Warnings:

  - Added the required column `total_payable` to the `fees_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `fees_details` ADD COLUMN `total_payable` DOUBLE NOT NULL;
