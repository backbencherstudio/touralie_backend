import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserStatsQueryDto } from './dto/user-stats-query.dto';

@Injectable()
export class OverviewService {
  constructor(private prisma: PrismaService) {}

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

  findAll() {
    return `This action returns all overview`;
  }

  findOne(id: number) {
    return `This action returns a #${id} overview`;
  }

  remove(id: number) {
    return `This action removes a #${id} overview`;
  }
}
