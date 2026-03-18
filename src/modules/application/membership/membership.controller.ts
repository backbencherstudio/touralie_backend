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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { Request } from 'express';

@ApiTags('Membership')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @ApiOperation({
    summary: 'Submit Membership Interest (User Only)',
    description: `
Registers the user's interest in a specific membership plan. 
This creates a "lead" that administrators can review to follow up with the user.

**Path Parameters:**
- **plan-id**: The Unique ID of the membership plan the user is interested in.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Membership interest submitted successfully.',
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
    summary: 'View Available Membership Plans (User Only)',
    description: `
Retrieves a list of all active membership plans available for purchase.
Users can browse these plans before submitting their interest.

**Response Data includes:**
- Plan title and description
- Price and billing period (e.g., WEEK, MONTH, YEAR)
- List of features and badge (e.g., Gold, Silver)
`,
  })
  @ApiResponse({
    status: 200,
    description: 'List of available membership plans.',
    schema: {
      example: {
        success: true,
        message: 'MemberShip Plans Fetched Successfully',
        data: [
          {
            id: 'cmm632yhc0003kg9wfbdqce74',
            title: 'Premium Plan',
            price: 199.99,
            badge: 'Gold',
            period: 'MONTH',
            features: ['Priority Support', 'Exclusive Content'],
            description: 'Best for professional users.',
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
