/*
  Warnings:

  - A unique constraint covering the columns `[prescription_id]` on the table `instructions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "instructions_prescription_id_key" ON "instructions"("prescription_id");
