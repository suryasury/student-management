/*
  Warnings:

  - You are about to drop the column `academic_year_from` on the `fees_details` table. All the data in the column will be lost.
  - You are about to drop the column `academic_year_to` on the `fees_details` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `fees_details` table. All the data in the column will be lost.
  - You are about to drop the column `academic_year_from` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `academic_year_to` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the `sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_section` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email,school_id,is_deleted]` on the table `admins` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mobile_number,school_id,is_deleted]` on the table `parents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[admission_number,school_id,is_deleted]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,school_id,is_deleted]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academic_year_id` to the `fees_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `standard_id` to the `fees_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_id` to the `fees_details` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `fees_details` DROP FOREIGN KEY `fees_details_section_id_fkey`;

-- DropForeignKey
ALTER TABLE `sections` DROP FOREIGN KEY `sections_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `students` DROP FOREIGN KEY `students_section_id_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_section` DROP FOREIGN KEY `teacher_section_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_section` DROP FOREIGN KEY `teacher_section_section_id_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_section` DROP FOREIGN KEY `teacher_section_teacher_id_fkey`;

-- DropIndex
DROP INDEX `parents_id_key` ON `parents`;

-- DropIndex
DROP INDEX `parents_mobile_number_key` ON `parents`;

-- DropIndex
DROP INDEX `students_admission_number_key` ON `students`;

-- DropIndex
DROP INDEX `teachers_mobile_number_key` ON `teachers`;

-- AlterTable
ALTER TABLE `admins` ADD COLUMN `mobileNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `fees_details` DROP COLUMN `academic_year_from`,
    DROP COLUMN `academic_year_to`,
    DROP COLUMN `section_id`,
    ADD COLUMN `academic_year_id` INTEGER NOT NULL,
    ADD COLUMN `standard_id` INTEGER NOT NULL,
    ADD COLUMN `student_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `students` DROP COLUMN `academic_year_from`,
    DROP COLUMN `academic_year_to`,
    DROP COLUMN `section_id`,
    ADD COLUMN `academic_year_id` INTEGER NULL,
    ADD COLUMN `standard_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `teachers` MODIFY `mobile_number` VARCHAR(15) NULL;

-- DropTable
DROP TABLE `sections`;

-- DropTable
DROP TABLE `teacher_section`;

-- CreateTable
CREATE TABLE `standards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `section` VARCHAR(10) NOT NULL,
    `standard` VARCHAR(10) NOT NULL,
    `school_id` INTEGER NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `standards_section_key`(`section`),
    UNIQUE INDEX `standards_standard_key`(`standard`),
    UNIQUE INDEX `standards_section_standard_school_id_is_active_key`(`section`, `standard`, `school_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_standards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `section_id` INTEGER NOT NULL,
    `teacher_id` INTEGER NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `school_id` INTEGER NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academic_year_from` DATETIME(3) NOT NULL,
    `academic_year_to` DATETIME(3) NOT NULL,
    `school_id` INTEGER NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `academic_years_academic_year_from_academic_year_to_school_id_key`(`academic_year_from`, `academic_year_to`, `school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `admins_email_school_id_is_deleted_key` ON `admins`(`email`, `school_id`, `is_deleted`);

-- CreateIndex
CREATE UNIQUE INDEX `parents_mobile_number_school_id_is_deleted_key` ON `parents`(`mobile_number`, `school_id`, `is_deleted`);

-- CreateIndex
CREATE UNIQUE INDEX `students_admission_number_school_id_is_deleted_key` ON `students`(`admission_number`, `school_id`, `is_deleted`);

-- CreateIndex
CREATE UNIQUE INDEX `teachers_email_school_id_is_deleted_key` ON `teachers`(`email`, `school_id`, `is_deleted`);

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_standard_id_fkey` FOREIGN KEY (`standard_id`) REFERENCES `standards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fees_details` ADD CONSTRAINT `fees_details_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fees_details` ADD CONSTRAINT `fees_details_standard_id_fkey` FOREIGN KEY (`standard_id`) REFERENCES `standards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fees_details` ADD CONSTRAINT `fees_details_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `standards` ADD CONSTRAINT `standards_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_standards` ADD CONSTRAINT `teacher_standards_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `standards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_standards` ADD CONSTRAINT `teacher_standards_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_standards` ADD CONSTRAINT `teacher_standards_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_years` ADD CONSTRAINT `academic_years_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
