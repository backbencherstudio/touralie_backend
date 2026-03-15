/*
  Warnings:

  - Made the column `prescription_id` on table `instructions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "instructions" ALTER COLUMN "prescription_id" SET NOT NULL;
