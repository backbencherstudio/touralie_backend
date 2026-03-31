import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OverviewService } from './overview.service';
import {
  PaginationQueryDto,
  UserStatsQueryDto,
} from './dto/query-overview.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
@ApiBearerAuth('admin_token')
@ApiTags('Overview')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PRACTITIONER)
@Controller('admin/overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @ApiOperation({
    summary: 'Get user stats',
    description: `Get user stats for the specified year and months. The response includes the total number of users and active users for each month.`,
  })
  @ApiResponse({
    status: 200,
    description: 'User stats',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: {
                type: 'string',
                example: 'Jan',
              },
              totalUsers: {
                type: 'number',
                example: 10,
              },
              activeUsers: {
                type: 'number',
                example: 5,
              },
            },
          },
        },
      },
    },
  })
  @Get('user-charts')
  getUserStats(@Query() query: UserStatsQueryDto) {
    return this.overviewService.getUserStats(query);
  }

  @ApiOperation({
    summary: 'Get activities',
    description: `Get activities for the specified page and limit.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Activities',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                example: 1,
              },
              title: {
                type: 'string',
                example: 'Activity 1',
              },
              description: {
                type: 'string',
                example: 'Description 1',
              },
            },
          },
        },
      },
    },
  })
  @Get('activities')
  getActivities(@Query() query: PaginationQueryDto) {
    return this.overviewService.getActivities(query);
  }

  @ApiOperation({
    summary: 'Get stats',
    description: `Get stats for the specified year and months. The response includes the total number of users and active users for each month.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Stats',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'object',
          properties: {
            total_patients: {
              type: 'number',
              example: 10,
            },
            total_prescriptions: {
              type: 'number',
              example: 5,
            },
          },
        },
      },
    },
  })
  @Get('stats')
  getStats() {
    return this.overviewService.getStats();
  }
}
