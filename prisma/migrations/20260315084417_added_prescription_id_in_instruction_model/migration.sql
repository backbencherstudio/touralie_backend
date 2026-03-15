-- AlterTable
ALTER TABLE "instructions" ADD COLUMN     "prescription_id" TEXT;

-- AddForeignKey
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
