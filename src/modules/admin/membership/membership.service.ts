import { Injectable } from '@nestjs/common';
import { CreateMemberShipPlanDto } from './dto/create-membership.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { MemberLeadsQueryDto } from './dto/query-membership.dto';
import { Prisma } from 'prisma/generated/client';

import { ActivityRepository } from 'src/common/repository/activity/activity.repository';

@Injectable()
export class MembershipService {
  constructor(
    private prisma: PrismaService,
    private activityRepository: ActivityRepository,
  ) {}
  async createMemberShipPlan(CreateMemberShipPlanDto: CreateMemberShipPlanDto) {
    const plan = await this.prisma.plan.create({
      data: CreateMemberShipPlanDto,
    });
    return {
      success: true,
      message: 'MemberShip Plan Created Successfully',
      data: plan,
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

  async findAllMemberLeads(query: MemberLeadsQueryDto) {
    const { page, limit, search, start_date, end_date } = query;
    const skip = (page - 1) * limit || 0;
    const take = limit || 10;
    const where: Prisma.MemberLeadsWhereInput = search
      ? {
          name: { contains: search, mode: 'insensitive' },
          email: { contains: search, mode: 'insensitive' },
          phone: { contains: search, mode: 'insensitive' },
        }
      : {};

    if (start_date && end_date) {
      where.created_at = {
        gte: start_date,
        lte: end_date,
      };
    }

    const leads = await this.prisma.memberLeads.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        created_at: true,
        member: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take,
    });
    const total = await this.prisma.memberLeads.count({ where });
    return {
      success: true,
      message: 'Member Leads Fetched Successfully',
      data: leads.map((l) => ({
        id: l.id,
        name: l.name || l.member?.name || '',
        email: l.email || l.member?.email || '',
        phone: l.phone || l.member?.phone_number || '',
        message: l.message || '',
        created_at: l.created_at,
      })),
      meta_data: {
        search,
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

  async findOneMemberLead(id: string) {
    const lead = await this.prisma.memberLeads.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        created_at: true,
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
          },
        },
        plan: {
          select: {
            id: true,
            title: true,
            badge: true,
            price: true,
            period: true,
            features: true,
            description: true,
          },
        },
      },
    });
    return {
      success: true,
      message: 'Member Lead Fetched Successfully',
      data: {
        id: lead.id,
        name: lead.name || lead.member?.name || '',
        email: lead.email || lead.member?.email || '',
        phone: lead.phone || lead.member?.phone_number || '',
        message: lead.message || '',
        created_at: lead.created_at,
        member_id: lead.member.id,
        plan: lead.plan,
      },
    };
  }

  async removeMemberShipPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    await this.prisma.plan.delete({
      where: {
        id: id,
      },
    });

    if (plan) {
      await this.activityRepository.createActivity(
        'Membership Plan Deleted',
        `Membership plan "${plan.title}" has been deleted.`,
      );
    }

    return {
      success: true,
      message: 'MemberShip Plan Delete Successfully',
    };
  }
}
