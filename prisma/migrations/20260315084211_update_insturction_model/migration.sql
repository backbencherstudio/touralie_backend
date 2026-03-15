/*
  Warnings:

  - You are about to drop the column `features` on the `instructions` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `instructions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "instructions" DROP COLUMN "features",
DROP COLUMN "title",
ADD COLUMN     "points" TEXT[];
