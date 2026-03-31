/*
  Warnings:

  - You are about to drop the `VideoChapters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `instructions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VideoChapters" DROP CONSTRAINT "VideoChapters_video_id_fkey";

-- DropForeignKey
ALTER TABLE "instructions" DROP CONSTRAINT "instructions_prescription_id_fkey";

-- DropTable
DROP TABLE "VideoChapters";

-- DropTable
DROP TABLE "instructions";
