import { Injectable, NotFoundException } from '@nestjs/common';
import {
  QueryPublicLibraryDto,
  QueryWatchHistoryDto,
} from './dto/query-library.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'prisma/generated/client';
import { UpdateWatchProgressDto } from './dto/update-watch-progress.dto';
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

  async findAllCategories() {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        title: 'asc',
      },
    });

    return {
      success: true,
      message: 'Categories found successfully',
      data: categories,
    };
  }

  async findAllFavoriteVideos(query: QueryPublicLibraryDto, userId: string) {
    const { page, limit, search, start_date, end_date, category_id } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FavoriteVideoWhereInput = {
      user_id: userId,
      video: {
        deleted_at: null,
        status: 'PUBLISHED',
      },
    };

    if (search) {
      where.video.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category_id) {
      where.video.category_id = category_id;
    }

    if (start_date || end_date) {
      where.video.created_at = {
        ...(start_date && { gte: start_date }),
        ...(end_date && { lte: end_date }),
      };
    }

    const favoriteVideo = await this.prisma.favoriteVideo.findMany({
      where,
      select: {
        id: true,
        video: {
          select: {
            id: true,
            title: true,
            duration: true,
            level: true,
            created_at: true,
            thumbnail_url: true,
            category: true,
            _count: {
              select: {
                video_chapters: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
    });

    const total = await this.prisma.favoriteVideo.count({ where });

    const formattedVideos = favoriteVideo.map((video) => ({
      id: video.video.id,
      title: video.video.title,
      duration: video.video.duration,
      level: video.video.level,
      created_at: video.video.created_at,
      is_favorite: true,
      thumbnail_url: video.video.thumbnail_url
        ? SojebStorage.url(video.video.thumbnail_url)
        : null,
      category: video.video.category.title,
      chapters_count: video.video._count.video_chapters,
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

  async findAllWatchHistory(query: QueryWatchHistoryDto, userId: string) {
    const {
      page,
      limit,
      search,
      start_date,
      end_date,
      category_id,
      watch_status,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WatchHistoryWhereInput = {
      user_id: userId,
      video: {
        deleted_at: null,
      },
    };

    if (search) {
      where.video.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category_id) {
      where.video.category_id = category_id;
    }

    if (start_date || end_date) {
      where.video.created_at = {
        ...(start_date && { gte: start_date }),
        ...(end_date && { lte: end_date }),
      };
    }

    if (watch_status) {
      if (watch_status === 'COMPLETED') {
        where.is_completed = true;
      } else if (watch_status === 'IN_PROGRESS') {
        where.is_completed = false;
      }
    }

    const watchHistory = await this.prisma.watchHistory.findMany({
      where,
      select: {
        id: true,
        is_completed: true,
        last_played_position: true,
        video: {
          select: {
            id: true,
            title: true,
            duration: true,
            level: true,
            created_at: true,
            thumbnail_url: true,
            category: true,
            _count: {
              select: {
                video_chapters: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        updated_at: 'desc',
      },
    });

    const total = await this.prisma.watchHistory.count({ where });

    const formattedVideos = watchHistory.map((video) => ({
      id: video.video.id,
      title: video.video.title,
      duration: video.video.duration,
      level: video.video.level,
      created_at: video.video.created_at,
      is_completed: video.is_completed,
      last_played_position: video.last_played_position,
      thumbnail_url: video.video.thumbnail_url
        ? SojebStorage.url(video.video.thumbnail_url)
        : null,
      category: video.video.category.title,
      chapters_count: video.video._count.video_chapters,
    }));

    return {
      success: true,
      message: 'Watch history found successfully',
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

    let last_watch_position = 0;
    let is_completed = false;

    if (userId) {
      const watchHistory = await this.prisma.watchHistory.findFirst({
        where: { video_id: id, user_id: userId },
      });
      if (watchHistory) {
        last_watch_position = watchHistory.last_played_position ?? 0;
        is_completed = watchHistory.is_completed;
      } else {
        // Create initial watch history record
        await this.prisma.watchHistory.create({
          data: {
            video_id: id,
            user_id: userId,
            last_played_position: 0,
            is_completed: false,
          },
        });
      }
    }

    const formattedVideo = {
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      level: video.level,
      created_at: video.created_at,
      is_favorite,
      last_watch_position,
      is_completed,
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

  async updateProgress(
    videoId: string,
    userId: string,
    dto: UpdateWatchProgressDto,
  ) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId, deleted_at: null },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const watchHistory = await this.prisma.watchHistory.findFirst({
      where: { video_id: videoId, user_id: userId },
    });

    const is_completed =
      dto.last_played_position >= (video.duration ?? 0) * 0.9;

    if (watchHistory) {
      await this.prisma.watchHistory.update({
        where: { id: watchHistory.id },
        data: {
          last_played_position: dto.last_played_position,
          is_completed: is_completed || watchHistory.is_completed,
          updated_at: new Date(),
        },
      });
    } else {
      await this.prisma.watchHistory.create({
        data: {
          video_id: videoId,
          user_id: userId,
          last_played_position: dto.last_played_position,
          is_completed: is_completed,
        },
      });
    }

    return {
      success: true,
      message: 'Watch progress updated successfully',
    };
  }
}
