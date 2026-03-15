import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateMemberLeadsDto } from './dto/create-membership.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}
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
    });
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
