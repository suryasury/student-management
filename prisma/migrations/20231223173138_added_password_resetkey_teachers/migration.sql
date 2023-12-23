/*
  Warnings:

  - Added the required column `need_password_reset` to the `teachers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `teachers` ADD COLUMN `need_password_reset` BOOLEAN NOT NULL;
