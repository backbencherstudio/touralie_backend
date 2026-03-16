import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
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

  // async findOnePrescription(id: string, userId: string) {
  //   const video = await this.prisma.video.findUnique({
  //     where: { id, deleted_at: null, status: 'PUBLISHED' },
  //     include: {
  //       category: true,
  //       video_chapters: true,
  //       prescriptions: {
  //         where: {
  //           patients: {
  //             some: {
  //               user_id: userId,
  //             },
  //           },
  //         },
  //         include: {
  //           instruction: true,
  //         },
  //         orderBy: {
  //           created_at: 'desc',
  //         },
  //         take: 1,
  //       },
  //     },
  //   });

  //   if (!video) {
  //     throw new NotFoundException('Video not found or not prescribed to you');
  //   }

  //   const prescription = video.prescriptions[0] || null;

  //   return {
  //     success: true,
  //     message: 'Prescription details found successfully',
  //     data: {
  //       id: video.id,
  //       title: video.title,
  //       description: video.description,
  //       url: video.url ? SojebStorage.url(video.url) : null,
  //       thumbnail_url: video.thumbnail_url
  //         ? SojebStorage.url(video.thumbnail_url)
  //         : null,
  //       status: video.status,
  //       category: video.category?.title || null,
  //       duration: video.duration,
  //       level: video.level,
  //       instruction: prescription?.instruction
  //         ? {
  //             description: prescription.instruction.description,
  //             points: prescription.instruction.points,
  //           }
  //         : null,
  //       video_chapters: video.video_chapters.map((chapter) => ({
  //         id: chapter.id,
  //         title: chapter.title,
  //         start_time: chapter.start_time,
  //         end_time: chapter.end_time,
  //         thumbnail_url: chapter.thumbnail_url
  //           ? SojebStorage.url(chapter.thumbnail_url)
  //           : null,
  //       })),
  //     },
  //   };
  // }

  update(id: number, updatePrescriptionDto: UpdatePrescriptionDto) {
    return `This action updates a #${id} prescription`;
  }

  remove(id: number) {
    return `This action removes a #${id} prescription`;
  }
}
