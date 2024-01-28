/*
  Warnings:

  - A unique constraint covering the columns `[academic_year_from,academic_year_to,school_id,academic_month_from,academic_month_to,is_deleted,is_active]` on the table `academic_years` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `academic_years_academic_year_from_academic_year_to_school_id_key` ON `academic_years`;

-- CreateIndex
CREATE UNIQUE INDEX `academic_years_academic_year_from_academic_year_to_school_id_key` ON `academic_years`(`academic_year_from`, `academic_year_to`, `school_id`, `academic_month_from`, `academic_month_to`, `is_deleted`, `is_active`);
