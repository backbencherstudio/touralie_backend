/*
  Warnings:

  - You are about to drop the column `level` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the `_PrescriptionToVideo` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `title` to the `prescriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_PrescriptionToVideo" DROP CONSTRAINT "_PrescriptionToVideo_A_fkey";

-- DropForeignKey
ALTER TABLE "_PrescriptionToVideo" DROP CONSTRAINT "_PrescriptionToVideo_B_fkey";

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "level";

-- DropTable
DROP TABLE "_PrescriptionToVideo";

-- DropEnum
DROP TYPE "Level";

-- CreateTable
CREATE TABLE "prescription_templates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,

    CONSTRAINT "prescription_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_videos" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reps" TEXT,
    "sets" TEXT,
    "weight" TEXT,
    "note" TEXT,
    "prescription_id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,

    CONSTRAINT "prescription_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PrescriptionTemplateToVideo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PrescriptionTemplateToVideo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PrescriptionTemplateToVideo_B_index" ON "_PrescriptionTemplateToVideo"("B");

-- AddForeignKey
ALTER TABLE "prescription_videos" ADD CONSTRAINT "prescription_videos_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_videos" ADD CONSTRAINT "prescription_videos_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrescriptionTemplateToVideo" ADD CONSTRAINT "_PrescriptionTemplateToVideo_A_fkey" FOREIGN KEY ("A") REFERENCES "prescription_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrescriptionTemplateToVideo" ADD CONSTRAINT "_PrescriptionTemplateToVideo_B_fkey" FOREIGN KEY ("B") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
