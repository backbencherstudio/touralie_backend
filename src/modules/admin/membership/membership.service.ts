import { Injectable } from '@nestjs/common';
import {
  CreateMembershipDto,
  CreateMemberShipPlanDto,
} from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}
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

  findAll() {
    return `This action returns all membership`;
  }

  findOne(id: number) {
    return `This action returns a #${id} membership`;
  }

  update(id: number, updateMembershipDto: UpdateMembershipDto) {
    return `This action updates a #${id} membership`;
  }

  remove(id: number) {
    return `This action removes a #${id} membership`;
  }
}
