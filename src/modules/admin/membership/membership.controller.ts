import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { CreateMemberShipPlanDto } from './dto/create-membership.dto';
import {
  ApiBasicAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { MemberLeadsQueryDto } from './dto/query-membership.dto';

@ApiTags('Membership')
@ApiBasicAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @ApiOperation({
    summary: 'Define a New Membership Plan',
    description: `This endpoint allows administrators to create a new membership plan, 
Required fields:
- title
- price
- billing_period
- features
Optional fields:
- description
`,
  })
  @ApiResponse({
    status: 201,
    description: 'MemberShip Plan Created Successfully',
    schema: {
      example: {
        success: true,
        message: 'MemberShip Plan Created Successfully',
        data: {
          id: 'cmm632yhc0003kg9wfbdqce74',
          title: 'title',
          price: '100.00',
          period: 'WEEK',
          features: ['feature1', 'feature2'],
          description: 'description',
        },
      },
    },
  })
  @Post('/plan')
  createMemberShipPlan(@Body() createMemberShipDto: CreateMemberShipPlanDto) {
    return this.membershipService.createMemberShipPlan(createMemberShipDto);
  }

  @ApiOperation({
    summary: 'Get all membership plans',
    description: `This endpoint allows administrators to retrieve a list of all membership plans, 
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
        data: {
          id: 'cmm632yhc0003kg9wfbdqce74',
          title: 'title',
          price: '100.00',
          period: 'WEEK',
          features: ['feature1', 'feature2'],
          description: 'description',
        },
      },
    },
  })
  @Get('/plans')
  findAllMemberShipPlan() {
    return this.membershipService.findAllMemberShipPlan();
  }

  @ApiOperation({
    summary: 'Get all member leads',
    description: `This endpoint allows administrators to retrieve a list of all member leads, 
Returns a list of all member leads. You can filter the leads by search query and get more leads by pagination.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Member Leads Fetched Successfully',
    schema: {
      example: {
        success: true,
        message: 'Member Leads Fetched Successfully',
        data: [
          {
            id: 'cmml32yhc0003kg9wfbdqce74',
            name: 'Najim',
            email: 'najim@gmail.com',
            phone: '123456789',
            message: 'Hello',
            created_at: '2026-03-15T14:08:40.000Z',
          },
        ],
        meta_data: {
          search: 'by name or emails or phone number',
          page: 1,
          limit: 10,
          total: 10,
        },
      },
    },
  })
  @Get('/leads')
  findAllMemberLeads(@Query() query: MemberLeadsQueryDto) {
    return this.membershipService.findAllMemberLeads(query);
  }

  @ApiOperation({
    summary: 'Get a member lead',
    description: `This endpoint allows administrators to retrieve a specific member lead, 
Required fields:
- member lead id
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Member Lead Fetched Successfully',
    schema: {
      example: {
        success: true,
        message: 'Member Lead Fetched Successfully',
        data: {
          id: 'cmml32yhc0003kg9wfbdqce74',
          name: 'Najim',
          email: 'najim@gmail.com',
          phone: '123456789',
          message: 'Hello',
          created_at: '2026-03-15T14:08:40.000Z',
          member_id: 'cmml32yhc0003kg9wfbdqce74',
          plan: {
            id: 'cmml32yhc0003kg9wfbdqce74',
            title: 'Premium Plan',
            price: 199.99,
            period: 'MONTH',
            features: [
              'Priority Support',
              'Exclusive Content',
              'Discount Offers',
            ],
            description:
              'This is a premium membership plan offering extra features.',
          },
        },
      },
    },
  })
  @Get('/leads/:id')
  findOneMemberLead(@Param('id') id: string) {
    return this.membershipService.findOneMemberLead(id);
  }

  @ApiOperation({
    summary: 'Delete a membership plan',
    description: `This endpoint allows administrators to delete a specific membership plan, 
Required fields:
- membership plan id
`,
  })
  @ApiResponse({
    status: 200,
    description: 'MemberShip Plan Deleted Successfully',
    schema: {
      example: {
        success: true,
        message: 'MemberShip Plan Deleted Successfully',
      },
    },
  })
  @Delete(':id')
  removeMemberShipPlan(@Param('id') id: string) {
    return this.membershipService.removeMemberShipPlan(id);
  }
}
