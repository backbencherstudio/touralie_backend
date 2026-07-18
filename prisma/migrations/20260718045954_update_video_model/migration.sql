-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'IMAGE', 'PDF');

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "media_type" "MediaType" NOT NULL DEFAULT 'VIDEO',
ALTER COLUMN "updated_at" DROP DEFAULT;
