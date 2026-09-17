/*
  Warnings:

  - Added the required column `type` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Material` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('THEORY', 'PRACTICAL');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "type" "ResourceType" NOT NULL;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "type" "ResourceType" NOT NULL;

-- CreateIndex
CREATE INDEX "Exam_courseId_academicYearId_type_idx" ON "Exam"("courseId", "academicYearId", "type");

-- CreateIndex
CREATE INDEX "Material_courseId_academicYearId_type_idx" ON "Material"("courseId", "academicYearId", "type");
