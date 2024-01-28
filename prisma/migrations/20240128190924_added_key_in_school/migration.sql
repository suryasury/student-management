-- AlterTable
ALTER TABLE `schools` ADD COLUMN `academic_year_end_month` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `academic_year_start_month` INTEGER NOT NULL DEFAULT 4;
