/*
  Warnings:

  - You are about to drop the column `section_id` on the `teacher_standards` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[section,standard,school_id,is_active,is_deleted]` on the table `standards` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `standard_id` to the `teacher_standards` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `teacher_standards` DROP FOREIGN KEY `teacher_standards_section_id_fkey`;

-- DropIndex
DROP INDEX `standards_section_standard_school_id_is_active_key` ON `standards`;

-- AlterTable
ALTER TABLE `fees_details` MODIFY `is_paid` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `teacher_standards` DROP COLUMN `section_id`,
    ADD COLUMN `standard_id` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `standards_section_standard_school_id_is_active_is_deleted_key` ON `standards`(`section`, `standard`, `school_id`, `is_active`, `is_deleted`);

-- AddForeignKey
ALTER TABLE `teacher_standards` ADD CONSTRAINT `teacher_standards_standard_id_fkey` FOREIGN KEY (`standard_id`) REFERENCES `standards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
