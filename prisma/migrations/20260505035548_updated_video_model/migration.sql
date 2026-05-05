-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('PRESCRIBABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE', 'LISTED');

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "type" "VideoType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "_UserToVideo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserToVideo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserToVideo_B_index" ON "_UserToVideo"("B");

-- AddForeignKey
ALTER TABLE "_UserToVideo" ADD CONSTRAINT "_UserToVideo_A_fkey" FOREIGN KEY ("A") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToVideo" ADD CONSTRAINT "_UserToVideo_B_fkey" FOREIGN KEY ("B") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
