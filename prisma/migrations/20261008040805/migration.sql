/*
  Warnings:

  - A unique constraint covering the columns `[cliniko_patient_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cliniko_patient_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_cliniko_patient_id_key" ON "users"("cliniko_patient_id");
