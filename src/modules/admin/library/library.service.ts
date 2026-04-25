import { Injectable } from '@nestjs/common';
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

import { ActivityRepository } from 'src/common/repository/activity/activity.repository';

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityRepository: ActivityRepository,
  ) {}

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
      await SojebStorage.put(
        thumbKey,
        thumbnailFile.buffer,
        thumbnailFile.mimetype,
      );
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

    await this.activityRepository.createActivity(
      'Video Upload Started',
      `A new video upload has been initiated.`,
    );

    const uploadUrl = await SojebStorage.getSignedUrl(
      key,
      3600,
      this.getContentType(filename),
    );

    return {
      success: true,
      message: 'Video upload initialized successfully',
      data: {
        video_id: video.id,
        upload_url: uploadUrl,
        status: video.status,
        thumbnail_url: video.thumbnail_url
          ? SojebStorage.url(video.thumbnail_url)
          : null,
      },
    };
  }

  async initReupload(
    id: string,
    initVideoUploadDto: InitVideoUploadDto,
    thumbnailFile?: Express.Multer.File,
  ) {
    const existingVideo = await this.prisma.video.findUnique({ where: { id } });
    if (!existingVideo) throw new Error('Video not found');

    const { filename } = initVideoUploadDto;
    const extension = filename.split('.').pop();
    const key = `${appConfig().storageUrl.tempVideo}${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    let thumbnailUrl = existingVideo.thumbnail_url;

    if (thumbnailFile) {
      // Delete old thumbnail if it exists
      if (existingVideo.thumbnail_url) {
        try {
          await SojebStorage.delete(existingVideo.thumbnail_url);
        } catch (e) {}
      }

      const thumbExtension = thumbnailFile.originalname.split('.').pop();
      const thumbKey = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
      await SojebStorage.put(thumbKey, thumbnailFile.buffer, thumbnailFile.mimetype);
      thumbnailUrl = thumbKey;
    }

    const updatedVideo = await this.prisma.video.update({
      where: { id },
      data: {
        url: key,
        status: VideoStatus.UPLOADING,
        thumbnail_url: thumbnailUrl,
        duration: initVideoUploadDto.duration ?? existingVideo.duration,
      },
    });

    await this.activityRepository.createActivity(
      'Video Re-upload Started',
      `Re-upload initiated for video "${existingVideo.title || 'Untitled'}".`,
    );

    const uploadUrl = await SojebStorage.getSignedUrl(
      key,
      3600,
      this.getContentType(filename),
    );

    return {
      success: true,
      message: 'Video upload re-initialized successfully',
      data: {
        video_id: id,
        upload_url: uploadUrl,
        status: updatedVideo.status,
        thumbnail_url: updatedVideo.thumbnail_url
          ? SojebStorage.url(updatedVideo.thumbnail_url)
          : null,
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

      const updatedVideo = await this.prisma.video.update({
        where: { id },
        data: {
          url: permanentKey,
          status: VideoStatus.DRAFT,
        },
      });

      await this.activityRepository.createActivity(
        'Video Upload Completed',
        `Video "${updatedVideo.title || 'Untitled'}" upload has been completed and is now in draft.`,
      );

      return {
        success: true,
        message: 'Video upload completed successfully',
        data: {
          ...updatedVideo,
          url: updatedVideo.url ? SojebStorage.url(updatedVideo.url) : null,
          thumbnail_url: updatedVideo.thumbnail_url
            ? SojebStorage.url(updatedVideo.thumbnail_url)
            : null,
        },
      };
    }

    return {
      success: true,
      message: 'Video upload completed successfully',
      data: {
        ...video,
        url: video.url ? SojebStorage.url(video.url) : null,
        thumbnail_url: video.thumbnail_url
          ? SojebStorage.url(video.thumbnail_url)
          : null,
      },
    };
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });

    await this.activityRepository.createActivity(
      'Category Created',
      `A new category "${category.title}" has been created.`,
    );

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
    const category = await this.prisma.category.delete({
      where: { id },
    });

    await this.activityRepository.createActivity(
      'Category Deleted',
      `Category "${category.title}" has been deleted.`,
    );

    return {
      success: true,
      message: 'Category deleted successfully',
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
        created_at: true,
        thumbnail_url: true,
        status: true,
        category: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      where,
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.video.count({ where });

    const formattedVideos = videos.map((video) => ({
      id: video.id,
      title: video.title,
      duration: video.duration,
      created_at: video.created_at,
      status: video.status,
      thumbnail_url: video.thumbnail_url
        ? SojebStorage.url(video.thumbnail_url)
        : null,
      category: video.category?.title,
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
      select: {
        id: true,
        title: true,
        duration: true,
        description: true,
        url: true,
        thumbnail_url: true,
        status: true,
        category: {
          select: {
            id: true,
            title: true,
          },
        },
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

    // sanitize data: remove empty strings, 'null', or 'undefined'
    Object.keys(data).forEach((key) => {
      if (
        data[key] === '' ||
        data[key] === 'null' ||
        data[key] === 'undefined'
      ) {
        delete data[key];
      }
    });

    if (thumbnailFile) {
      // delete old thumbnail if exists
      if (video.thumbnail_url) {
        try {
          await SojebStorage.delete(video.thumbnail_url);
        } catch (e) {}
      }

      const thumbExtension = thumbnailFile.originalname.split('.').pop();
      const thumbKey = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
      await SojebStorage.put(
        thumbKey,
        thumbnailFile.buffer,
        thumbnailFile.mimetype,
      );
      data.thumbnail_url = thumbKey;
    }

    // remove thumbnail field from data as it's not a prisma field
    delete data.thumbnail;
    await this.activityRepository.createActivity(
      'Video Updated',
      `Video "${video.title}" metadata has been updated.`,
    );
    const updatedVideo = await this.prisma.video.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        duration: true,
        description: true,
        url: true,
        thumbnail_url: true,
        status: true,
        category: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
    return {
      success: true,
      message: 'Video updated successfully',
      data: {
        ...updatedVideo,
        url: updatedVideo.url ? SojebStorage.url(updatedVideo.url) : null,
        thumbnail_url: updatedVideo.thumbnail_url
          ? SojebStorage.url(updatedVideo.thumbnail_url)
          : null,
      },
    };
  }

  async remove(id: string) {
    const videoToDelete = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!videoToDelete) throw new Error('Video not found');

    // 1. Delete video file
    if (videoToDelete.url) {
      try {
        await SojebStorage.delete(videoToDelete.url);
      } catch (e) {}
    }

    if (videoToDelete.thumbnail_url) {
      try {
        await SojebStorage.delete(videoToDelete.thumbnail_url);
      } catch (e) {}
    }

    const video = await this.prisma.video.delete({
      where: { id },
    });

    await this.activityRepository.createActivity(
      'Video Deleted',
      `Video "${videoToDelete.title}" and its associated files have been permanently deleted.`,
    );

    return {
      success: true,
      message: 'Video and associated files deleted successfully',
      data: video,
    };
  }

  // async addChapter(
  //   videoId: string,
  //   chapterData: CreateChapterDto,
  //   thumbnail?: Express.Multer.File,
  // ) {
  //   const video = await this.prisma.video.findUnique({
  //     where: { id: videoId },
  //   });
  //   if (!video) throw new Error('Video not found');
  //   if (video.status === VideoStatus.UPLOADING) {
  //     throw new Error('Cannot add chapters while video is uploading.');
  //   }

  //   await this.validateChapterOverlap(
  //     videoId,
  //     chapterData.start_time,
  //     chapterData.end_time,
  //   );

  //   let thumbnailUrl = null;
  //   if (thumbnail) {
  //     const thumbExtension = thumbnail.originalname.split('.').pop();
  //     thumbnailUrl = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
  //     await SojebStorage.put(
  //       thumbnailUrl,
  //       thumbnail.buffer,
  //       thumbnail.mimetype,
  //     );
  //   }

  //   const { thumbnail: _, ...rest } = chapterData;

  //   return {
  //     success: true,
  //     message: 'Chapter added successfully',
  //     data: await this.prisma.videoChapters.create({
  //       data: {
  //         ...rest,
  //         thumbnail_url: thumbnailUrl,
  //         video_id: videoId,
  //       },
  //     }),
  //   };
  // }

  // async updateChapter(
  //   chapterId: string,
  //   chapterData: UpdateChapterDtoLocal,
  //   thumbnail?: Express.Multer.File,
  // ) {
  //   const chapter = await this.prisma.videoChapters.findUnique({
  //     where: { id: chapterId },
  //     include: { video: true },
  //   });
  //   if (!chapter) throw new Error('Chapter not found');
  //   if (chapter.video?.status === VideoStatus.UPLOADING) {
  //     throw new Error('Cannot update chapters while video is uploading.');
  //   }

  //   await this.validateChapterOverlap(
  //     chapter.video_id,
  //     chapterData.start_time || chapter.start_time,
  //     chapterData.end_time || chapter.end_time,
  //     chapterId,
  //   );

  //   const data: any = { ...chapterData };

  //   if (thumbnail) {
  //     if (chapter.thumbnail_url) {
  //       try {
  //         await SojebStorage.delete(chapter.thumbnail_url);
  //       } catch (e) {}
  //     }
  //     const thumbExtension = thumbnail.originalname.split('.').pop();
  //     const thumbnailUrl = `${appConfig().storageUrl.thumbnail}${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExtension}`;
  //     await SojebStorage.put(
  //       thumbnailUrl,
  //       thumbnail.buffer,
  //       thumbnail.mimetype,
  //     );
  //     data.thumbnail_url = thumbnailUrl;
  //   }

  //   delete data.thumbnail;

  //   return {
  //     success: true,
  //     message: 'Chapter updated successfully',
  //     data: await this.prisma.videoChapters.update({
  //       where: { id: chapterId },
  //       data,
  //     }),
  //   };
  // }

  // async removeChapter(chapterId: string) {
  //   const chapter = await this.prisma.videoChapters.findUnique({
  //     where: { id: chapterId },
  //     include: { video: true },
  //   });
  //   if (!chapter) throw new Error('Chapter not found');
  //   if (chapter.video?.status === VideoStatus.UPLOADING) {
  //     throw new Error('Cannot remove chapters while video is uploading.');
  //   }

  //   // Delete chapter thumbnail
  //   if (chapter.thumbnail_url) {
  //     try {
  //       await SojebStorage.delete(chapter.thumbnail_url);
  //     } catch (e) {}
  //   }

  //   return {
  //     success: true,
  //     message: 'Chapter deleted successfully',
  //     data: await this.prisma.videoChapters.delete({
  //       where: { id: chapterId },
  //     }),
  //   };
  // }

  // async getChapters(videoId: string) {
  //   const chapters = await this.prisma.videoChapters.findMany({
  //     where: { video_id: videoId },
  //     orderBy: { start_time: 'asc' },
  //   });

  //   const formattedChapters = chapters.map((chapter) => ({
  //     ...chapter,
  //     thumbnail_url: chapter.thumbnail_url
  //       ? SojebStorage.url(chapter.thumbnail_url)
  //       : null,
  //   }));

  //   return {
  //     success: true,
  //     message: 'Chapters fetched successfully',
  //     data: formattedChapters,
  //   };
  // }

  // private async validateChapterOverlap(
  //   videoId: string,
  //   startTime: string,
  //   endTime: string,
  //   currentChapterId?: string,
  // ) {
  //   const chapters = await this.prisma.videoChapters.findMany({
  //     where: {
  //       video_id: videoId,
  //       id: currentChapterId ? { not: currentChapterId } : undefined,
  //     },
  //   });

  //   const newStart = this.timeToSeconds(startTime);
  //   const newEnd = this.timeToSeconds(endTime);

  //   for (const chapter of chapters) {
  //     const existingStart = this.timeToSeconds(chapter.start_time);
  //     const existingEnd = this.timeToSeconds(chapter.end_time);

  //     if (
  //       (newStart >= existingStart && newStart < existingEnd) ||
  //       (newEnd > existingStart && newEnd <= existingEnd) ||
  //       (newStart <= existingStart && newEnd >= existingEnd)
  //     ) {
  //       throw new Error('Chapter time overlaps with an existing chapter');
  //     }
  //   }
  // }

  // private timeToSeconds(time: string): number {
  //   const parts = time.split(':').map(Number);
  //   if (parts.length === 3) {
  //     return parts[0] * 3600 + parts[1] * 60 + parts[2];
  //   } else if (parts.length === 2) {
  //     return parts[0] * 60 + parts[1];
  //   }
  //   return Number(time);
  // }

  private getContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      mp4: 'video/mp4',
      mkv: 'video/x-matroska',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }
}
