/*
  Warnings:

  - A unique constraint covering the columns `[standard_id,school_id]` on the table `teacher_standards` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `teacher_standards_standard_id_school_id_key` ON `teacher_standards`(`standard_id`, `school_id`);
