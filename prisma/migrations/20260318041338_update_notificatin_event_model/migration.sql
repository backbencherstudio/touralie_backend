/*
  Warnings:

  - You are about to drop the column `text` on the `notification_events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notification_events" DROP COLUMN "text",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT;
