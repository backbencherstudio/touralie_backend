import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createActivity(title: string, description: string) {
    return await this.prisma.activity.create({
      data: {
        title,
        description,
      },
    });
  }

  async getActivities(limit: number = 20, offset: number = 0) {
    const activities = await this.prisma.activity.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        created_at: 'desc',
      },
    });
    console.log(activities);
    const count = await this.prisma.activity.count();
    return { activities, count };
  }
}
