import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  PaginationQueryDto,
  UserStatsQueryDto,
} from './dto/query-overview.dto';
import { ActivityRepository } from 'src/common/repository/activity/activity.repository';
import { Role } from 'src/common/guard/role/role.enum';

@Injectable()
export class OverviewService {
  constructor(
    private prisma: PrismaService,
    private activityRepository: ActivityRepository,
  ) {}

  async getActivities(query: PaginationQueryDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const { activities, count } = await this.activityRepository.getActivities(
      limit,
      skip,
    );
    return {
      success: true,
      data: activities,
      meta_data: {
        page,
        limit,
        total: count,
      },
    };
  }

  async getUserStats(query: UserStatsQueryDto) {
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const stats = await Promise.all(
      months.map(async (month) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const totalUsers = await this.prisma.user.count({
          where: {
            created_at: {
              lte: endDate,
            },
            deleted_at: null,
          },
        });

        const activeUsers = await this.prisma.dailyCheckIn.groupBy({
          by: ['user_id'],
          where: {
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        return {
          month: startDate.toLocaleString('default', { month: 'short' }),
          totalUsers,
          activeUsers: activeUsers.length,
        };
      }),
    );

    return {
      success: true,
      data: stats,
    };
  }

  async getStats() {
    const totalPatients = await this.prisma.user.count({
      where: {
        deleted_at: null,
        type: Role.USER,
      },
    });

    const totalPrescriptions = await this.prisma.prescription.count({
      where: {
        deleted_at: null,
      },
    });

    return {
      success: true,
      data: {
        total_patients: totalPatients,
        total_prescriptions: totalPrescriptions,
      },
    };
  }
}
