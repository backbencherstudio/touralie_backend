import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UnauthorizedException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { CreateMemberLeadsDto } from './dto/create-membership.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import {
  ApiBasicAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { Request } from 'express';

@ApiTags('Membership')
@ApiBasicAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @ApiOperation({
    summary: 'Create a new membership lead (User Only)',
    description: `This endpoint allows users to create a new membership lead, 
Returns a new membership lead.

Plan ID param is required.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Member Lead Created Successfully',
    schema: {
      example: {
        success: true,
        message: 'Member Lead Created Successfully',
      },
    },
  })
  @Post(':plan-id')
  createMemberLeads(
    @Req() req: Request,
    @Param('plan-id') planId: string,
    @Body() createMemberLeadsDto: CreateMemberLeadsDto,
  ) {
    const user_id = req.user.userId;
    if (!user_id) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.membershipService.createMemberLeads(
      createMemberLeadsDto,
      user_id,
      planId,
    );
  }

  @ApiOperation({
    summary: 'Get all membership plans (User Only)',
    description: `This endpoint allows users to retrieve a list of all membership plans, 
Returns a list of all membership plans.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'MemberShip Plans Fetched Successfully',
    schema: {
      example: {
        success: true,
        message: 'MemberShip Plans Fetched Successfully',
        data: [
          {
            id: 'cmm632yhc0003kg9wfbdqce74',
            title: 'title',
            price: '100.00',
            badge: 'Gold',
            period: 'WEEK',
            features: ['feature1', 'feature2'],
            description: 'description',
          },
        ],
      },
    },
  })
  @Get('plans')
  findAllMemberShipPlan() {
    return this.membershipService.findAllMemberShipPlan();
  }
}
