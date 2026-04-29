ALTER TABLE "watch_histories" ADD COLUMN "prescription_id" TEXT;

ALTER TABLE "watch_histories"
ADD CONSTRAINT "watch_histories_prescription_id_fkey"
FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
