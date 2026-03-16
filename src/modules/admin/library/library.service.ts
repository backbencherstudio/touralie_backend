import { Injectable } from '@nestjs/common';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import appConfig from '../../../config/app.config';
import { InitVideoUploadDto } from './dto/init-video-upload.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto as UpdateChapterDtoLocal } from './dto/update-chapter.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { VideoStatus } from 'prisma/generated/enums';
import { LibraryQueryStatus, QueryLibraryDto } from './dto/query-library.dto';
import { Prisma } from 'prisma/generated/client';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async initUpload(
    initVideoUploadDto: InitVideoUploadDto,
    thumbnailFile?: Express.Multer.File,
  ) {
    const { filename } = initVideoUploadDto;
    const extension = filename.split('.').pop();
    const key = `${appConfig().storageUrl.tempVideo}${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    let thumbnailUrl = null;
    if (thumbnailFile) {
      const thumbExtension = thumbnailFile.originalname.split('.').pop();
      const thumbKey = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
      await SojebStorage.put(thumbKey, thumbnailFile.buffer);
      thumbnailUrl = thumbKey;
    }

    const video = await this.prisma.video.create({
      data: {
        title: 'Untitled',
        url: key,
        status: VideoStatus.UPLOADING,
        thumbnail_url: thumbnailUrl,
        duration: initVideoUploadDto.duration || 0,
      },
    });

    const uploadUrl = await SojebStorage.getSignedUrl(key);

    return {
      success: true,
      message: 'Video upload initialized successfully',
      data: {
        video_id: video.id,
        upload_url: uploadUrl,
        status: video.status,
        thumbnail_url: video.thumbnail_url,
        key,
      },
    };
  }

  async initReupload(id: string, initVideoUploadDto: InitVideoUploadDto) {
    const { filename } = initVideoUploadDto;
    const extension = filename.split('.').pop();
    const key = `${appConfig().storageUrl.tempVideo}${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    await this.prisma.video.update({
      where: { id },
      data: {
        url: key,
        status: VideoStatus.UPLOADING,
      },
    });

    const uploadUrl = await SojebStorage.getSignedUrl(key);

    return {
      success: true,
      message: 'Video upload re-initialized successfully',
      data: {
        video_id: id,
        upload_url: uploadUrl,
        key,
      },
    };
  }

  async completeUpload(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video || !video.url) throw new Error('Video not found or invalid URL');

    const tempPrefix = appConfig().storageUrl.tempVideo;
    const permanentPrefix = appConfig().storageUrl.video;

    if (video.url.startsWith(tempPrefix)) {
      const permanentKey = video.url.replace(tempPrefix, permanentPrefix);
      await SojebStorage.move(video.url, permanentKey);

      return await this.prisma.video.update({
        where: { id },
        data: {
          url: permanentKey,
          status: VideoStatus.DRAFT,
        },
      });
    }

    return {
      success: true,
      message: 'Video upload completed successfully',
      data: video,
    };
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });

    return {
      success: true,
      message: 'Category created successfully',
      data: category,
    };
  }

  async findAllCategories() {
    const categories = await this.prisma.category.findMany({
      where: { deleted_at: null },
    });

    return {
      success: true,
      message: 'Categories found successfully',
      data: categories,
    };
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return {
      success: true,
      message: 'Category deleted successfully',
      data: category,
    };
  }

  async findAll(query: QueryLibraryDto) {
    const { page, limit, search, start_date, end_date, status, category_id } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.VideoWhereInput = {
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status !== LibraryQueryStatus.ALL) {
      where.status = status as VideoStatus;
    }

    if (category_id) {
      where.category_id = category_id;
    }

    if (start_date && end_date) {
      where.created_at = {
        gte: start_date,
        lte: end_date,
      };
    }

    const videos = await this.prisma.video.findMany({
      select: {
        id: true,
        title: true,
        duration: true,
        level: true,
        created_at: true,
        thumbnail_url: true,
        status: true,
        category: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            video_chapters: true,
          },
        },
      },
      where,
      skip,
      take: limit,
    });

    const total = await this.prisma.video.count({ where });

    const formattedVideos = videos.map((video) => ({
      id: video.id,
      title: video.title,
      duration: video.duration,
      level: video.level,
      created_at: video.created_at,
      status: video.status,
      thumbnail_url: video.thumbnail_url
        ? SojebStorage.url(video.thumbnail_url)
        : null,
      category: video.category?.title,
      chapters_count: video._count.video_chapters,
    }));

    return {
      success: true,
      message: 'Videos found successfully',
      data: formattedVideos,
      meta_data: {
        page,
        limit,
        total,
        search,
        filters: {
          status,
          category_id,
          start_date,
          end_date,
        },
      },
    };
  }

  async findOne(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        category: true,
        video_chapters: true,
      },
    });

    if (video) {
      video.url = video.url ? SojebStorage.url(video.url) : null;
      video.thumbnail_url = video.thumbnail_url
        ? SojebStorage.url(video.thumbnail_url)
        : null;
    }

    return {
      success: true,
      message: 'Video found successfully',
      data: video,
    };
  }

  async update(
    id: string,
    updateLibraryDto: UpdateLibraryDto,
    thumbnailFile?: Express.Multer.File,
  ) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new Error('Video not found');

    if (video.status === VideoStatus.UPLOADING) {
      throw new Error(
        'Cannot update metadata while video is uploading. Please wait for upload to complete.',
      );
    }

    const data: any = { ...updateLibraryDto };

    if (thumbnailFile) {
      // delete old thumbnail if exists
      if (video.thumbnail_url) {
        await SojebStorage.delete(video.thumbnail_url);
      }

      const thumbExtension = thumbnailFile.originalname.split('.').pop();
      const thumbKey = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
      await SojebStorage.put(thumbKey, thumbnailFile.buffer);
      data.thumbnail_url = thumbKey;
    }

    // remove thumbnail field from data as it's not a prisma field
    delete data.thumbnail;

    return {
      success: true,
      message: 'Video updated successfully',
      data: await this.prisma.video.update({
        where: { id },
        data,
      }),
    };
  }

  async remove(id: string) {
    const video = await this.prisma.video.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Video deleted successfully',
      data: video,
    };
  }

  async addChapter(
    videoId: string,
    chapterData: CreateChapterDto,
    thumbnail?: Express.Multer.File,
  ) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) throw new Error('Video not found');
    if (video.status === VideoStatus.UPLOADING) {
      throw new Error('Cannot add chapters while video is uploading.');
    }

    await this.validateChapterOverlap(
      videoId,
      chapterData.start_time,
      chapterData.end_time,
    );

    let thumbnailUrl = null;
    if (thumbnail) {
      const thumbExtension = thumbnail.originalname.split('.').pop();
      thumbnailUrl = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
      await SojebStorage.put(thumbnailUrl, thumbnail.buffer);
    }

    const { thumbnail: _, ...rest } = chapterData;

    return {
      success: true,
      message: 'Chapter added successfully',
      data: await this.prisma.videoChapters.create({
        data: {
          ...rest,
          thumbnail_url: thumbnailUrl,
          video_id: videoId,
        },
      }),
    };
  }

  async updateChapter(
    chapterId: string,
    chapterData: UpdateChapterDtoLocal,
    thumbnail?: Express.Multer.File,
  ) {
    const chapter = await this.prisma.videoChapters.findUnique({
      where: { id: chapterId },
      include: { video: true },
    });
    if (!chapter) throw new Error('Chapter not found');
    if (chapter.video?.status === VideoStatus.UPLOADING) {
      throw new Error('Cannot update chapters while video is uploading.');
    }

    await this.validateChapterOverlap(
      chapter.video_id,
      chapterData.start_time || chapter.start_time,
      chapterData.end_time || chapter.end_time,
      chapterId,
    );

    const data: any = { ...chapterData };

    if (thumbnail) {
      if (chapter.thumbnail_url) {
        await SojebStorage.delete(chapter.thumbnail_url);
      }
      const thumbExtension = thumbnail.originalname.split('.').pop();
      const thumbnailUrl = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
      await SojebStorage.put(thumbnailUrl, thumbnail.buffer);
      data.thumbnail_url = thumbnailUrl;
    }

    delete data.thumbnail;

    return {
      success: true,
      message: 'Chapter updated successfully',
      data: await this.prisma.videoChapters.update({
        where: { id: chapterId },
        data,
      }),
    };
  }

  async removeChapter(chapterId: string) {
    const chapter = await this.prisma.videoChapters.findUnique({
      where: { id: chapterId },
      include: { video: true },
    });
    if (!chapter) throw new Error('Chapter not found');
    if (chapter.video?.status === VideoStatus.UPLOADING) {
      throw new Error('Cannot remove chapters while video is uploading.');
    }

    return {
      success: true,
      message: 'Chapter deleted successfully',
      data: await this.prisma.videoChapters.delete({
        where: { id: chapterId },
      }),
    };
  }

  async getChapters(videoId: string) {
    const chapters = await this.prisma.videoChapters.findMany({
      where: { video_id: videoId },
      orderBy: { start_time: 'asc' },
    });

    return {
      success: true,
      message: 'Chapters fetched successfully',
      data: chapters,
    };
  }

  private async validateChapterOverlap(
    videoId: string,
    startTime: string,
    endTime: string,
    currentChapterId?: string,
  ) {
    const chapters = await this.prisma.videoChapters.findMany({
      where: {
        video_id: videoId,
        id: currentChapterId ? { not: currentChapterId } : undefined,
      },
    });

    const newStart = this.timeToSeconds(startTime);
    const newEnd = this.timeToSeconds(endTime);

    for (const chapter of chapters) {
      const existingStart = this.timeToSeconds(chapter.start_time);
      const existingEnd = this.timeToSeconds(chapter.end_time);

      if (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        throw new Error('Chapter time overlaps with an existing chapter');
      }
    }
  }

  private timeToSeconds(time: string): number {
    const parts = time.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return Number(time);
  }
}
