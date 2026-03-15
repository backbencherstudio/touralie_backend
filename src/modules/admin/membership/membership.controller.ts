import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import {
  CreateMemberShipPlanDto,
  CreateMembershipDto,
} from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { ApiTags } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@ApiTags('Membership')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post('/plan')
  createMemberShipPlan(@Body() createMemberShipDto: CreateMemberShipPlanDto) {
    return this.membershipService.createMemberShipPlan(createMemberShipDto);
  }

  @Get()
  findAll() {
    return this.membershipService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membershipService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    return this.membershipService.update(+id, updateMembershipDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.membershipService.remove(+id);
  }
}
