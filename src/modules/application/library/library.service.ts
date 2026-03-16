import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryPublicLibraryDto } from './dto/query-library.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'prisma/generated/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPublicLibraryDto, userId?: string) {
    const { page, limit, search, category_id, start_date, end_date } = query;
    const skip = (page - 1) * limit;
    let personalization: string[] = [];

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { personalization: true },
      });
      if (user) {
        personalization = user.personalization;
      }
    }

    // Prepare search term for SQL
    const searchTerm = search ? `%${search}%` : null;

    // Use a single query to fetch ranked videos with their category and chapter counts
    // This ensures all sorting and filtering happens entirely in the database
    const videos = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 
        v.id,
        v.title,
        v.duration,
        v.level,
        v.created_at,
        v.status,
        v.thumbnail_url,
        c.title as category_title,
        (SELECT COUNT(*)::int FROM "VideoChapters" vc WHERE vc.video_id = v.id) as chapters_count,
        ${userId ? Prisma.sql`EXISTS(SELECT 1 FROM "FavoriteVideo" fv WHERE fv.video_id = v.id AND fv.user_id = ${userId})` : Prisma.sql`false`} as is_favorite
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE v.deleted_at IS NULL 
        AND v.status = 'PUBLISHED'
        ${searchTerm ? Prisma.sql`AND (v.title ILIKE ${searchTerm} OR v.description ILIKE ${searchTerm})` : Prisma.empty}
        ${category_id ? Prisma.sql`AND v.category_id = ${category_id}` : Prisma.empty}
        ${start_date ? Prisma.sql`AND v.created_at >= ${new Date(start_date)}` : Prisma.empty}
        ${end_date ? Prisma.sql`AND v.created_at <= ${new Date(end_date)}` : Prisma.empty}
      ORDER BY 
        (CASE WHEN c.title = ANY(${personalization}) THEN 1 ELSE 0 END) DESC,
        v.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `);

    // Base conditions for total count
    const where: Prisma.VideoWhereInput = {
      deleted_at: null,
      status: 'PUBLISHED',
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category_id && { category_id }),
      ...((start_date || end_date) && {
        created_at: {
          ...(start_date && { gte: start_date }),
          ...(end_date && { lte: end_date }),
        },
      }),
    };

    const total = await this.prisma.video.count({ where });

    const formattedVideos = videos.map((video) => ({
      id: video.id,
      title: video.title,
      duration: video.duration,
      level: video.level,
      created_at: video.created_at,
      status: video.status,
      is_favorite: video.is_favorite,
      thumbnail_url: video.thumbnail_url
        ? SojebStorage.url(video.thumbnail_url)
        : null,
      category: video.category_title,
      chapters_count: video.chapters_count,
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
        filter: {
          category_id,
          start_date,
          end_date,
        },
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const video = await this.prisma.video.findUnique({
      where: { id, deleted_at: null, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        level: true,
        created_at: true,
        status: true,
        url: true,
        thumbnail_url: true,
        category: {
          select: {
            id: true,
            title: true,
          },
        },
        video_chapters: {
          select: {
            id: true,
            title: true,
            start_time: true,
            end_time: true,
            thumbnail_url: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    let is_favorite = false;
    if (userId) {
      const favorite = await this.prisma.favoriteVideo.findFirst({
        where: { video_id: id, user_id: userId },
      });
      is_favorite = !!favorite;
    }

    const formattedVideo = {
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      level: video.level,
      created_at: video.created_at,
      status: video.status,
      is_favorite,
      url: video.url ? SojebStorage.url(video.url) : null,
      thumbnail_url: video.thumbnail_url
        ? SojebStorage.url(video.thumbnail_url)
        : null,
      category: video.category?.title,
      video_chapters: video.video_chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        start_time: chapter.start_time,
        end_time: chapter.end_time,
        thumbnail_url: chapter.thumbnail_url
          ? SojebStorage.url(chapter.thumbnail_url)
          : null,
      })),
    };

    return {
      success: true,
      message: 'Video found successfully',
      data: formattedVideo,
    };
  }

  async favorite(id: string, userId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id, deleted_at: null, status: 'PUBLISHED' },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const favorite = await this.prisma.favoriteVideo.findFirst({
      where: { video_id: id, user_id: userId },
    });

    if (favorite) {
      await this.prisma.favoriteVideo.delete({
        where: { id: favorite.id },
      });
      return {
        success: true,
        message: 'Video unfavorited successfully',
      };
    }

    await this.prisma.favoriteVideo.create({
      data: { video_id: id, user_id: userId },
    });

    return {
      success: true,
      message: 'Video favorited successfully',
    };
  }
}
