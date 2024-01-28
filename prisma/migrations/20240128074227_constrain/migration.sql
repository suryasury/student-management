-- DropForeignKey
ALTER TABLE `teacher_standards` DROP FOREIGN KEY `teacher_standards_standard_id_fkey`;

-- AlterTable
ALTER TABLE `teacher_standards` MODIFY `standard_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `teacher_standards` ADD CONSTRAINT `teacher_standards_standard_id_fkey` FOREIGN KEY (`standard_id`) REFERENCES `standards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
