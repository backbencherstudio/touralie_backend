import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrescribedMembersQueryDto } from './dto/query-prescription.dto';
import { Prisma } from 'prisma/generated/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

import { ActivityRepository } from 'src/common/repository/activity/activity.repository';

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async createPrescription(createPrescriptionDto: CreatePrescriptionDto) {
    const prescription = await this.prisma.prescription.create({
      data: {
        instruction: {
          create: {
            description: createPrescriptionDto.instruction.description,
            points: createPrescriptionDto.instruction.points,
          },
        },
        videos: {
          connect: createPrescriptionDto.video_ids.map((id) => ({ id })),
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
      `A new prescription has been created with ${createPrescriptionDto.video_ids.length} videos for ${createPrescriptionDto.patient_ids.length} patients.`,
    );

    return {
      success: true,
      message: 'Prescription created successfully',
      data: prescription,
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
        {
          prescription: {
            videos: {
              some: {
                title: { contains: search, mode: 'insensitive' },
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
            videos: {
              select: {
                title: true,
              },
            },
          },
        },
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
      videos: patient.prescription.videos.map((video) => video.title),
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
            instruction: {
              select: {
                id: true,
                description: true,
                points: true,
              },
            },
            videos: {
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                thumbnail_url: true,
                url: true,
                video_chapters: {
                  select: {
                    id: true,
                    title: true,
                    start_time: true,
                    end_time: true,
                    thumbnail_url: true,
                  },
                },
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
      instruction: {
        instruction_id: patient.prescription.instruction.id,
        description: patient.prescription.instruction.description,
        points: patient.prescription.instruction.points,
      },
      videos: patient.prescription.videos.map((video) => ({
        video_id: video.id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnail_url: video.thumbnail_url
          ? SojebStorage.url(video.thumbnail_url)
          : null,
        url: video.url ? SojebStorage.url(video.url) : null,
        video_chapters: video.video_chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          start_time: chapter.start_time,
          end_time: chapter.end_time,
          thumbnail_url: (chapter as any).thumbnail_url
            ? SojebStorage.url((chapter as any).thumbnail_url)
            : null,
        })),
        category: video.category?.title,
      })),
    };

    return {
      success: true,
      message: 'Prescription fetched successfully',
      data: formattedPatient,
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
