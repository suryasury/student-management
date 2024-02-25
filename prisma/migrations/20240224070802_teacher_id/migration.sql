/*
  Warnings:

  - Added the required column `teacherId` to the `teachers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `teachers` ADD COLUMN `teacherId` VARCHAR(30) NOT NULL;
