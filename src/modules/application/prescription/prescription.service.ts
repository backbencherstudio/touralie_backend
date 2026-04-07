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

    const where: Prisma.PrescriptionWhereInput = {
      patients: {
        some: {
          user_id: userId,
        },
      },
      videos: {
        some: {
          video: {
            status: 'PUBLISHED',
          },
        },
      },
    };

    if (search) {
      where.OR = [
        {
          videos: {
            some: {
              video: { title: { contains: search, mode: 'insensitive' } },
            },
          },
        },
        {
          videos: {
            some: {
              video: { description: { contains: search, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    const prescriptions = await this.prisma.prescription.findMany({
      where,
      select: {
        id: true,
        title: true,
        created_at: true,
        videos: {
          select: {
            video: {
              select: {
                thumbnail_url: true,
                duration: true,
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

    const total = await this.prisma.prescription.count({ where });

    const formattedPrescriptions = prescriptions.map((p) => {
      const totalVideos = p.videos.length;
      let totalCompletedVideos = 0;
      let hasAnyProgress = false;
      let thumbnail_url: string | null =
        p?.videos?.[0]?.video?.thumbnail_url || null;

      // Count completed videos and check for any progress
      p.videos.forEach((v) => {
        const history = v.video.watch_histories?.[0];
        if (history) {
          if (history.is_completed) {
            totalCompletedVideos++;
          }
          if (history.last_played_position > 0 || history.is_completed) {
            hasAnyProgress = true;
          }
        }
      });

      // Determine thumbnail:
      // Show the in-progress video's thumbnail (current video to watch).
      // If completed → show next video's thumbnail.
      // If ALL completed → cycle back to 1st video's thumbnail.
      if (totalCompletedVideos >= totalVideos && totalVideos > 0) {
        // All completed — cycle back to the 1st video's thumbnail
        thumbnail_url = p.videos[0]?.video?.thumbnail_url || null;
      } else {
        for (const v of p.videos) {
          const history = v.video.watch_histories?.[0];
          const isCompleted = history?.is_completed || false;
          if (!isCompleted) {
            thumbnail_url = v.video.thumbnail_url;
            break;
          }
        }
      }

      // Determine watch_status
      let watch_status: string;
      if (totalVideos === 0 || !hasAnyProgress) {
        watch_status = 'NOT_STARTED';
      } else if (totalCompletedVideos >= totalVideos) {
        watch_status = 'COMPLETED';
      } else {
        watch_status = 'IN_PROGRESS';
      }

      return {
        id: p.id,
        title: p.title,
        created_at: p.created_at,
        total_videos: totalVideos,
        total_completed_videos: totalCompletedVideos,
        thumbnail_url: thumbnail_url ? SojebStorage.url(thumbnail_url) : null,
        watch_status,
      };
    });

    return {
      success: true,
      message: 'Prescriptions found successfully',
      data: formattedPrescriptions,
      meta_data: {
        page,
        limit,
        total,
        search,
      },
    };
  }

  async findOnePrescription(id: string, userId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: {
        id,
        patients: {
          some: {
            user_id: userId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        videos: {
          select: {
            id: true,
            reps: true,
            sets: true,
            weight: true,
            note: true,
            video: {
              select: {
                id: true,
                title: true,
                description: true,
                url: true,
                thumbnail_url: true,
                category: { select: { title: true } },
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
            },
          },
        },
      },
    });

    if (!prescription) {
      return {
        success: false,
        message: 'Prescription not found',
      };
    }

    const formattedPrescription = {
      id: prescription.id,
      title: prescription.title,
      created_at: prescription.created_at,
      last_played_video_id: prescription?.videos?.find(
        (v) => v.video.watch_histories?.[0]?.last_played_position > 0,
      )?.video?.id,
      videos: prescription.videos.map((v) => ({
        id: v.video.id,
        reps: v.reps,
        sets: v.sets,
        weight: v.weight,
        note: v.note,
        title: v.video.title,
        description: v.video.description,
        url: v.video.url ? SojebStorage.url(v.video.url) : null,
        thumbnail_url: v.video.thumbnail_url
          ? SojebStorage.url(v.video.thumbnail_url)
          : null,
        category: v.video.category?.title,
        last_played_position:
          v.video.watch_histories?.[0]?.last_played_position,
        is_completed: v.video.watch_histories?.[0]?.is_completed,
      })),
    };

    return {
      success: true,
      message: 'Prescription found successfully',
      data: formattedPrescription,
    };
  }

  async lastPlayedPrescriptionVideo(userId: string) {
    let activeVideo = null;
    let activePrescriptionId = null;
    let activePrescriptionTitle = null;
    let watchStatus = 'NOT_STARTED';

    // 1. Try to find the most recently played video for this user natively in DB
    const latestWatchHistory = await this.prisma.watchHistory.findFirst({
      where: {
        user_id: userId,
        video: {
          status: 'PUBLISHED',
          prescription_videos: {
            some: {
              prescription: { patients: { some: { user_id: userId } } },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
      select: {
        is_completed: true,
        last_played_position: true,
        video: {
          select: {
            id: true,
            title: true,
            url: true,
            duration: true,
            thumbnail_url: true,
            category: { select: { title: true } },
            prescription_videos: {
              where: {
                prescription: { patients: { some: { user_id: userId } } },
              },
              select: {
                prescription_id: true,
                prescription: { select: { title: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (
      latestWatchHistory &&
      latestWatchHistory.video.prescription_videos.length > 0
    ) {
      activeVideo = latestWatchHistory.video;
      activePrescriptionId =
        latestWatchHistory.video.prescription_videos[0].prescription_id;
      activePrescriptionTitle =
        latestWatchHistory.video.prescription_videos[0].prescription.title;
      watchStatus = latestWatchHistory.is_completed
        ? 'COMPLETED'
        : 'IN_PROGRESS';
    } else {
      // 2. User hasn't watched anything. Find the latest prescription's first video directly via DB.
      const fallbackCandidate = await this.prisma.prescriptionVideo.findFirst({
        where: {
          prescription: { patients: { some: { user_id: userId } } },
          video: { status: 'PUBLISHED' },
        },
        orderBy: [
          { prescription: { created_at: 'desc' } },
          { video: { created_at: 'asc' } },
        ],
        select: {
          prescription_id: true,
          prescription: { select: { title: true } },
          video: {
            select: {
              id: true,
              title: true,
              url: true,
              duration: true,
              thumbnail_url: true,
              category: { select: { title: true } },
            },
          },
        },
      });

      if (!fallbackCandidate) {
        return {
          success: false,
          message: 'No prescriptions found',
        };
      }

      activeVideo = fallbackCandidate.video;
      activePrescriptionId = fallbackCandidate.prescription_id;
      activePrescriptionTitle = fallbackCandidate.prescription.title;
    }

    // 3. DB Level Aggregation for Total videos & Completed videos
    const [totalVideos, completedVideos] = await Promise.all([
      this.prisma.prescriptionVideo.count({
        where: {
          prescription_id: activePrescriptionId,
          video: { status: 'PUBLISHED' },
        },
      }),
      this.prisma.prescriptionVideo.count({
        where: {
          prescription_id: activePrescriptionId,
          video: {
            status: 'PUBLISHED',
            watch_histories: {
              some: {
                user_id: userId,
                is_completed: true,
              },
            },
          },
        },
      }),
    ]);

    const prescriptionProgress =
      totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    // 4. Determine Dynamic Message Based on Progress (Using Switch for 10% intervals)
    let progressMessage = 'Start your journey to recovery today!';
    const progressBracket = Math.floor(prescriptionProgress / 10);

    switch (progressBracket) {
      case 10:
        progressMessage =
          'Congratulations! You have successfully completed this prescription.';
        break;
      case 9:
        progressMessage = 'Just one last push to cross the finish line!';
        break;
      case 8:
        progressMessage = 'Almost finished! Your dedication is paying off.';
        break;
      case 7:
        progressMessage = 'So close now! Just a few more to go.';
        break;
      case 6:
        progressMessage = "You're on a roll! Recovery is in sight.";
        break;
      case 5:
        progressMessage = 'More than halfway! Keep pushing forward.';
        break;
      case 4:
        progressMessage = "Almost halfway there! You've got this.";
        break;
      case 3:
        progressMessage = "You're doing great! Keep following the plan.";
        break;
      case 2:
        progressMessage = 'Excellent consistency! Stay focused.';
        break;
      case 1:
        progressMessage = "Keep it up! You're making steady progress.";
        break;
      default:
        if (prescriptionProgress > 0) {
          progressMessage = "Great start! You've taken the first step.";
        }
        break;
    }

    return {
      success: true,
      message: 'Prescription video fetched successfully',
      data: {
        video_id: activeVideo.id,
        prescription_title: activePrescriptionTitle,
        video_title: activeVideo.title,
        video_thumbnail: activeVideo.thumbnail_url
          ? SojebStorage.url(activeVideo.thumbnail_url)
          : null,
        video_duration: activeVideo.duration || 0,
        total_videos: totalVideos,
        watch_status: watchStatus,
        progress: prescriptionProgress,
        progress_message: progressMessage,
      },
    };
  }
}
