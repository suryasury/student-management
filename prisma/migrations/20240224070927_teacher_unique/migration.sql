/*
  Warnings:

  - A unique constraint covering the columns `[email,school_id,teacherId]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `teachers_email_school_id_teacherId_key` ON `teachers`(`email`, `school_id`, `teacherId`);
