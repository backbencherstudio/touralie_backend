ALTER TABLE "watch_histories"
DROP CONSTRAINT IF EXISTS "watch_histories_user_id_fkey";

ALTER TABLE "watch_histories"
DROP CONSTRAINT IF EXISTS "watch_histories_video_id_fkey";

ALTER TABLE "watch_histories"
ADD CONSTRAINT "watch_histories_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "watch_histories"
ADD CONSTRAINT "watch_histories_video_id_fkey"
FOREIGN KEY ("video_id") REFERENCES "videos"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
