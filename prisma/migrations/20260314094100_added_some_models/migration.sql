-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCE');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PlanPeriod" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "personalization" TEXT[];

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT,
    "url" TEXT,
    "thumbnail_url" TEXT,
    "description" TEXT,
    "level" "Level",
    "category_id" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'UPLOADING',
    "duration" INTEGER,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoChapters" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "video_id" TEXT,

    CONSTRAINT "VideoChapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_histories" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "video_id" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_played_position" INTEGER,

    CONSTRAINT "watch_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "features" TEXT[],

    CONSTRAINT "instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteVideo" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "video_id" TEXT,

    CONSTRAINT "FavoriteVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "period" "PlanPeriod" NOT NULL DEFAULT 'WEEK',
    "description" TEXT,
    "badge" TEXT NOT NULL,
    "features" TEXT[],

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_leads" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "member_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,

    CONSTRAINT "member_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "description" TEXT,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PrescriptionToVideo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PrescriptionToVideo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PrescriptionToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PrescriptionToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PrescriptionToVideo_B_index" ON "_PrescriptionToVideo"("B");

-- CreateIndex
CREATE INDEX "_PrescriptionToUser_B_index" ON "_PrescriptionToUser"("B");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoChapters" ADD CONSTRAINT "VideoChapters_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteVideo" ADD CONSTRAINT "FavoriteVideo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteVideo" ADD CONSTRAINT "FavoriteVideo_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_leads" ADD CONSTRAINT "member_leads_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrescriptionToVideo" ADD CONSTRAINT "_PrescriptionToVideo_A_fkey" FOREIGN KEY ("A") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrescriptionToVideo" ADD CONSTRAINT "_PrescriptionToVideo_B_fkey" FOREIGN KEY ("B") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrescriptionToUser" ADD CONSTRAINT "_PrescriptionToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrescriptionToUser" ADD CONSTRAINT "_PrescriptionToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
