import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateMemberLeadsDto } from './dto/create-membership.dto';
import { PrismaService } from 'src/prisma/prisma.service';

import { ActivityRepository } from 'src/common/repository/activity/activity.repository';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class MembershipService {
  constructor(
    private prisma: PrismaService,
    private activityRepository: ActivityRepository,
    private notificationRepository: NotificationRepository,
  ) {}
  async createMemberLeads(
    createMemberLeadsDto: CreateMemberLeadsDto,
    user_id: string,
    plan_id: string,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: {
        id: plan_id,
      },
    });
    if (!plan) {
      throw new BadRequestException('Plan not found or invalid plan id');
    }
    const memberLead = await this.prisma.memberLeads.create({
      data: {
        ...createMemberLeadsDto,
        member: {
          connect: {
            id: user_id,
          },
        },
        plan: {
          connect: {
            id: plan_id,
          },
        },
      },
      include: {
        member: true,
        plan: true,
      },
    });

    await this.activityRepository.createActivity(
      'New Member Lead Created',
      `A new interest lead has been created by "${memberLead.member.name}" for plan "${memberLead.plan.title}".`,
    );

    // Notify Admins
    const admins = await this.prisma.user.findMany({
      where: { type: 'admin' },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.notificationRepository.createNotification({
        receiver_id: admin.id,
        title: 'New Member Lead Created',
        description: `New member lead created by "${memberLead.member.name}" for plan "${memberLead.plan.title}".`,
        type: 'package',
      });
    }

    return {
      success: true,
      message: 'Member Lead Created Successfully',
    };
  }

  async findAllMemberShipPlan() {
    const plans = await this.prisma.plan.findMany({
      select: {
        id: true,
        title: true,
        badge: true,
        price: true,
        period: true,
        features: true,
        description: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return {
      success: true,
      message: 'MemberShip Plans Fetched Successfully',
      data: plans,
    };
  }
}
