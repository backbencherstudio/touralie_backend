import { Injectable } from '@nestjs/common';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'prisma/generated/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPrescriptions(query: QueryPrescriptionDto, userId: string) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VideoWhereInput = {
      prescriptions: {
        some: {
          patients: {
            some: {
              user_id: userId,
            },
          },
        },
      },
      deleted_at: null,
      status: 'PUBLISHED',
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const videos = await this.prisma.video.findMany({
      where,
      select: {
        id: true,
        title: true,
        duration: true,
        level: true,
        created_at: true,
        status: true,
        thumbnail_url: true,
        category: {
          select: {
            title: true,
          },
        },
        _count: {
          select: {
            video_chapters: true,
          },
        },
        watch_histories: {
          where: {
            user_id: userId,
          },
          select: {
            is_completed: true,
            last_played_position: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
    });

    const total = await this.prisma.video.count({ where });

    const formattedVideos = videos.map((video) => {
      const history = video.watch_histories[0] || null;
      return {
        id: video.id,
        title: video.title,
        duration: video.duration,
        level: video.level,
        created_at: video.created_at,
        watch_status: history?.is_completed
          ? 'COMPLETED'
          : history?.last_played_position > 0
            ? 'IN_PROGRESS'
            : 'NOT_STARTED',
        is_completed: history?.is_completed || false,
        last_watch_position: history?.last_played_position || 0,
        thumbnail_url: video.thumbnail_url
          ? SojebStorage.url(video.thumbnail_url)
          : null,
        category: video.category?.title || null,
        chapters_count: video._count.video_chapters,
      };
    });

    return {
      success: true,
      message: 'Prescriptions found successfully',
      data: formattedVideos,
      meta_data: {
        page,
        limit,
        total,
        search,
      },
    };
  }

  async lastPlayedPrescriptionVideo(userId: string) {
    const candidates = await this.prisma.video.findMany({
      where: {
        prescriptions: {
          some: {
            patients: { some: { user_id: userId } },
          },
        },
        deleted_at: null,
        status: 'PUBLISHED',
      },
      include: {
        category: true,
        video_chapters: true,
        watch_histories: {
          where: { user_id: userId },
        },
        prescriptions: {
          where: {
            patients: { some: { user_id: userId } },
          },
          include: { instruction: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (candidates.length === 0)
      return {
        success: false,
        message: 'No prescriptions found',
      };

    // 1. Filter for incomplete ones and sort by watch_history.updated_at DESC (LIFO Stack)
    const startedIncomplete = candidates
      .filter(
        (c) =>
          c.watch_histories.length > 0 && !c.watch_histories[0].is_completed,
      )
      .sort((a, b) => {
        const timeA = new Date(a.watch_histories[0].updated_at).getTime();
        const timeB = new Date(b.watch_histories[0].updated_at).getTime();
        return timeB - timeA;
      });

    if (startedIncomplete.length > 0) {
      return this.formatPrescriptionVideo(startedIncomplete[0]);
    }

    // 2. Filter for unstarted ones and sort by video.created_at ASC (FIFO Queue)
    const unstarted = candidates
      .filter((c) => c.watch_histories.length === 0)
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB;
      });

    if (unstarted.length > 0) {
      return this.formatPrescriptionVideo(unstarted[0]);
    }

    // 3. Fallback: If everything is complete, return the oldest video in the queue (FIFO)
    const sortedAll = candidates.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    });

    return this.formatPrescriptionVideo(sortedAll[0]);
  }

  private formatPrescriptionVideo(video: any) {
    const history = video.watch_histories[0] || null;
    const prescription = video.prescriptions[0] || null;

    return {
      success: true,
      message: 'Prescription found successfully',
      data: {
        id: video.id,
        title: video.title,
        description: video.description,
        url: video.url ? SojebStorage.url(video.url) : null,
        thumbnail_url: video.thumbnail_url
          ? SojebStorage.url(video.thumbnail_url)
          : null,
        category: video.category?.title || null,
        duration: video.duration,
        level: video.level,
        is_completed: history?.is_completed || false,
        last_watch_position: history?.last_played_position || 0,
        watch_status: history?.is_completed
          ? 'COMPLETED'
          : history?.last_played_position > 0
            ? 'IN_PROGRESS'
            : 'NOT_STARTED',
        instruction: prescription?.instruction
          ? {
              description: prescription.instruction.description,
              points: prescription.instruction.points,
            }
          : null,
        video_chapters: video.video_chapters.map((chapter: any) => ({
          id: chapter.id,
          title: chapter.title,
          start_time: chapter.start_time,
          end_time: chapter.end_time,
          thumbnail_url: chapter.thumbnail_url
            ? SojebStorage.url(chapter.thumbnail_url)
            : null,
        })),
      },
    };
  }
}
