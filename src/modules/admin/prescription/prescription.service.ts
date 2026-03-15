import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrescribedMembersQueryDto } from './dto/query-prescription.dto';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) {}

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

  findOnePrescription(id: number) {
    return `This action returns a #${id} prescription`;
  }

  updatePrescription(id: number, updatePrescriptionDto: UpdatePrescriptionDto) {
    return `This action updates a #${id} prescription`;
  }

  removePrescription(id: number) {
    return `This action removes a #${id} prescription`;
  }
}
