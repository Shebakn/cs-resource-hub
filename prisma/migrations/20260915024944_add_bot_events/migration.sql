/*
  Warnings:

  - You are about to drop the column `departmentId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `levelId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `termId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `academicYearId` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `academicYearId` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `Source` table. All the data in the column will be lost.
  - Added the required column `courseOfferingId` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseOfferingId` to the `Material` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseOfferingId` to the `Source` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BotEventType" AS ENUM ('WAITING_DOCUMENT', 'WAITING_TITLE', 'WAITING_ADMIN_PROMOTION', 'PROCESSING');

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_levelId_fkey";

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_termId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Source" DROP CONSTRAINT "Source_courseId_fkey";

-- DropIndex
DROP INDEX "Course_departmentId_levelId_termId_idx";

-- DropIndex
DROP INDEX "Exam_courseId_academicYearId_idx";

-- DropIndex
DROP INDEX "Exam_courseId_academicYearId_type_idx";

-- DropIndex
DROP INDEX "Material_courseId_academicYearId_idx";

-- DropIndex
DROP INDEX "Material_courseId_academicYearId_type_idx";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "departmentId",
DROP COLUMN "levelId",
DROP COLUMN "termId";

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "academicYearId",
DROP COLUMN "courseId",
ADD COLUMN     "courseOfferingId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Material" DROP COLUMN "academicYearId",
DROP COLUMN "courseId",
ADD COLUMN     "courseOfferingId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Source" DROP COLUMN "courseId",
ADD COLUMN     "courseOfferingId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "BotEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "event" "BotEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "trackId" INTEGER,
    "levelId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,

    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotEvent_createdAt_idx" ON "BotEvent"("createdAt");

-- CreateIndex
CREATE INDEX "BotEvent_event_idx" ON "BotEvent"("event");

-- CreateIndex
CREATE UNIQUE INDEX "BotEvent_userId_key" ON "BotEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Track_departmentId_name_key" ON "Track"("departmentId", "name");

-- CreateIndex
CREATE INDEX "CourseOffering_departmentId_trackId_levelId_termId_academic_idx" ON "CourseOffering"("departmentId", "trackId", "levelId", "termId", "academicYearId");

-- CreateIndex
CREATE INDEX "Exam_courseOfferingId_idx" ON "Exam"("courseOfferingId");

-- CreateIndex
CREATE INDEX "Exam_courseOfferingId_type_idx" ON "Exam"("courseOfferingId", "type");

-- CreateIndex
CREATE INDEX "Material_courseOfferingId_idx" ON "Material"("courseOfferingId");

-- CreateIndex
CREATE INDEX "Material_courseOfferingId_type_idx" ON "Material"("courseOfferingId", "type");

-- CreateIndex
CREATE INDEX "Source_courseOfferingId_idx" ON "Source"("courseOfferingId");

-- AddForeignKey
ALTER TABLE "BotEvent" ADD CONSTRAINT "BotEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
