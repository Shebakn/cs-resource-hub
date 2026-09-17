/*
  Warnings:

  - Added the required column `telegramChatId` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telegramChatId` to the `Material` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "telegramChatId" TEXT NOT NULL,
ALTER COLUMN "telegramFileId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "telegramChatId" TEXT NOT NULL,
ALTER COLUMN "telegramFileId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Exam_telegramChatId_telegramMessageId_idx" ON "Exam"("telegramChatId", "telegramMessageId");

-- CreateIndex
CREATE INDEX "Material_telegramChatId_telegramMessageId_idx" ON "Material"("telegramChatId", "telegramMessageId");
