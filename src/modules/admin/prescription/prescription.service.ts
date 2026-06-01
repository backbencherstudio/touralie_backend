import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreatePrescriptionDto,
  CreatePrescriptionTemplateDto,
} from './dto/create-prescription.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrescribedMembersQueryDto } from './dto/query-prescription.dto';
import { Prisma } from 'prisma/generated/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

import { ActivityRepository } from 'src/common/repository/activity/activity.repository';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityRepository: ActivityRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly mailService: MailService,
  ) {}

  async createPrescription(createPrescriptionDto: CreatePrescriptionDto) {
    // Validate: only users with type "patient" can be assigned as patients
    const users = await this.prisma.user.findMany({
      where: { id: { in: createPrescriptionDto.patient_ids } },
      select: { id: true, type: true, name: true, email: true },
    });

    const nonPatientIds = users
      .filter((user) => user.type !== 'user')
      .map((user) => user.name);

    if (nonPatientIds.length > 0) {
      throw new BadRequestException(
        `The following user(s) (${nonPatientIds.join(', ')}) cannot be assigned as patients.`,
      );
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        title: createPrescriptionDto.title,
        videos: {
          create: createPrescriptionDto.videos.map((video) => ({
            video: {
              connect: {
                id: video.video_id,
              },
            },
            reps: video.reps,
            sets: video.sets,
            weight: video.weight,
            note: video.note,
          })),
        },
        patients: {
          create: createPrescriptionDto.patient_ids.map((id) => ({
            user: {
              connect: { id },
            },
          })),
        },
      },
    });

    if (!prescription) {
      throw new InternalServerErrorException('Failed to create prescription');
    }

    await this.activityRepository.createActivity(
      'New Prescription Created',
      `A new prescription has been created with ${createPrescriptionDto.videos.length} videos for ${createPrescriptionDto.patient_ids.length} patients.`,
    );

    const prescribedVideos = await this.prisma.video.findMany({
      where: {
        id: {
          in: createPrescriptionDto.videos.map((video) => video.video_id),
        },
      },
      select: {
        title: true,
      },
    });

    const videoTitles = prescribedVideos
      .map((video) => video.title?.trim())
      .filter((title): title is string => Boolean(title));

    // Notify Patients
    for (const patient of users) {
      await this.notificationRepository.createNotification({
        receiver_id: patient.id,
        title: 'New Prescription Assigned',
        description: `A new prescription has been assigned to you with ${createPrescriptionDto.videos.length} videos.`,
        type: 'prescription',
      });

      if (patient.email) {
        await this.mailService.sendPrescriptionAssignedEmail({
          name: patient.name || 'there',
          email: patient.email,
          prescriptionTitle: createPrescriptionDto.title,
          totalVideos: createPrescriptionDto.videos.length,
          videoTitles,
        });
      }
    }

    return {
      success: true,
      message: 'Prescription created successfully',
    };
  }

  async createPrescriptionTemplate(
    createPrescriptionTemplateDto: CreatePrescriptionTemplateDto,
  ) {
    const prescriptionTemplate = await this.prisma.prescriptionTemplate.create({
      data: {
        title: createPrescriptionTemplateDto.title,
        videos: {
          connect: createPrescriptionTemplateDto.video_ids.map((id) => ({
            id,
          })),
        },
      },
    });

    if (!prescriptionTemplate) {
      throw new InternalServerErrorException(
        'Failed to create prescription template',
      );
    }

    await this.activityRepository.createActivity(
      'New Prescription Template Created',
      `A new prescription template has been created with ${createPrescriptionTemplateDto.video_ids.length} videos.`,
    );

    return {
      success: true,
      message: 'Prescription template created successfully',
      data: prescriptionTemplate,
    };
  }

  async findAllPrescription(query: PrescribedMembersQueryDto) {
    const { page, limit, search, start_date, end_date } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {};

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { prescription: { title: { contains: search, mode: 'insensitive' } } },
        {
          prescription: {
            videos: {
              some: {
                video: { title: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        },
      ];
    }

    if (start_date && end_date) {
      where.prescription = {
        created_at: {
          gte: start_date,
          lte: end_date,
        },
      };
    }

    const patients = await this.prisma.patient.findMany({
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prescription: {
          select: {
            title: true,
            created_at: true,
            _count: {
              select: {
                videos: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      where,
      skip,
      take: limit,
    });

    const total = await this.prisma.patient.count({
      where,
    });

    const formattedPatients = patients.map((patient) => ({
      id: patient.id,
      user_id: patient.user.id,
      name: patient.user.name,
      email: patient.user.email,
      title: patient.prescription.title,
      prescribed_at: patient.prescription.created_at,
      total_videos: patient.prescription._count.videos,
    }));

    return {
      success: true,
      message: 'Prescription fetched successfully',
      data: formattedPatients,
      meta_data: {
        page,
        limit,
        total,
        filters: {
          start_date,
          end_date,
        },
      },
    };
  }

  async findAllPrescriptionTemplates(query: PrescribedMembersQueryDto) {
    const { page, limit, search, start_date, end_date } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.PrescriptionTemplateWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        {
          videos: {
            some: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (start_date && end_date) {
      where.created_at = {
        gte: start_date,
        lte: end_date,
      };
    }

    const prescriptionTemplates =
      await this.prisma.prescriptionTemplate.findMany({
        where,

        select: {
          id: true,
          title: true,
          created_at: true,
          _count: {
            select: {
              videos: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      });

    const total = await this.prisma.prescriptionTemplate.count({
      where,
    });

    return {
      success: true,
      message: 'Prescription templates fetched successfully',
      data: prescriptionTemplates.map(({ _count, ...prescriptionTemplate }) => {
        return {
          ...prescriptionTemplate,
          total_videos: _count.videos,
        };
      }),
      meta_data: {
        page,
        limit,
        total,
        filters: {
          start_date,
          end_date,
        },
      },
    };
  }

  async findOnePrescription(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prescription: {
          select: {
            id: true,
            title: true,
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
                    duration: true,
                    thumbnail_url: true,
                    url: true,
                    category: {
                      select: {
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!patient) {
      throw new InternalServerErrorException('Failed to find prescription');
    }

    const formattedPatient = {
      patient_id: patient.id,
      member_id: patient.user.id,
      member_name: patient.user.name,
      member_email: patient.user.email,
      prescription_id: patient.prescription.id,
      title: patient.prescription.title,
      total_videos: patient?.prescription?.videos?.length,
      videos: patient?.prescription?.videos?.map((video) => ({
        video_id: video.id,
        reps: video.reps,
        sets: video.sets,
        weight: video.weight,
        note: video.note,
        title: video.video.title,
        description: video.video.description,
        duration: video.video.duration,
        thumbnail_url: video.video.thumbnail_url
          ? SojebStorage.url(video.video.thumbnail_url)
          : null,
        url: video.video.url ? SojebStorage.url(video.video.url) : null,

        category: video?.video?.category?.title,
      })),
    };

    return {
      success: true,
      message: 'Prescription fetched successfully',
      data: formattedPatient,
    };
  }

  async findOnePrescriptionTemplate(id: string) {
    const prescriptionTemplate =
      await this.prisma.prescriptionTemplate.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          title: true,
          videos: {
            select: {
              id: true,
              title: true,
              description: true,
              updated_at: true,
              duration: true,
              thumbnail_url: true,
              url: true,
              category: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

    if (!prescriptionTemplate) {
      throw new InternalServerErrorException(
        'Failed to find prescription template',
      );
    }

    const formattedPrescriptionTemplate = {
      id: prescriptionTemplate.id,
      title: prescriptionTemplate.title,
      total_videos: prescriptionTemplate.videos.length,
      videos: prescriptionTemplate.videos.map((video) => ({
        video_id: video.id,
        title: video.title,
        description: video.description,
        updated_at: video.updated_at,
        duration: video.duration,
        thumbnail_url: video.thumbnail_url
          ? SojebStorage.url(video.thumbnail_url)
          : null,
        url: video.url ? SojebStorage.url(video.url) : null,
        category: video.category?.title,
      })),
    };

    return {
      success: true,
      message: 'Prescription template fetched successfully',
      data: formattedPrescriptionTemplate,
    };
  }

  async removePrescriptionTemplate(id: string) {
    const prescriptionTemplate =
      await this.prisma.prescriptionTemplate.findUnique({
        where: {
          id,
        },
      });

    if (!prescriptionTemplate) {
      throw new InternalServerErrorException(
        'Failed to find prescription template',
      );
    }

    const deletedPrescriptionTemplate =
      await this.prisma.prescriptionTemplate.delete({
        where: {
          id: prescriptionTemplate.id,
        },
      });

    if (!deletedPrescriptionTemplate) {
      throw new InternalServerErrorException(
        'Failed to delete prescription template',
      );
    }

    await this.activityRepository.createActivity(
      'Prescription Template Deleted',
      `A prescription template "${deletedPrescriptionTemplate.title}" has been deleted.`,
    );

    return {
      success: true,
      message: 'Prescription template deleted successfully',
    };
  }

  async removePrescription(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: {
        id,
      },
    });

    if (!patient) {
      throw new InternalServerErrorException('Failed to find prescription');
    }

    const deletedPatient = await this.prisma.patient.delete({
      where: {
        id: patient.id,
      },
      include: {
        user: true,
      },
    });

    if (!deletedPatient) {
      throw new InternalServerErrorException('Failed to delete prescription');
    }

    await this.activityRepository.createActivity(
      'Prescription Deleted',
      `A prescription for member "${deletedPatient.user.name}" has been deleted.`,
    );

    return {
      success: true,
      message: 'Prescription deleted successfully',
    };
  }
}
