import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

import { QueryNotificationDto } from './dto/query-notification.dto';

@ApiTags('Notification')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    summary: 'Retrieve All My Notifications (User Only)',
    description: `
Fetch a paginated list of all notifications for the authenticated user. 

**Notification Details:**
- **title**: Brief heading of the notification.
- **description**: Detailed content or message.
- **type**: The category of notification.
- **created_at**: Timestamp of when the notification was generated.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications retrieved successfully.',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'cmm632yhc0003kg9wfbdqce74',
            title: 'New Prescription Assigned',
            description:
              'A new prescription has been assigned to you with 5 videos.',
            type: 'blog',
            created_at: '2026-03-16T10:00:00.000Z',
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 50,
        },
      },
    },
  })
  @Get()
  async findAll(@Req() req: Request, @Query() query: QueryNotificationDto) {
    try {
      const user_id = req.user.userId;
      const notification = await this.notificationService.findAll(
        user_id,
        query,
      );
      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Delete a Specific Notification (User Only)',
    description: 'Permanently removes a single notification record by its ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully.',
    schema: {
      example: {
        success: true,
        message: 'Notification deleted successfully',
      },
    },
  })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;
      const notification = await this.notificationService.remove(id, user_id);
      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Clear All My Notifications (User Only)',
    description:
      'Removes all notification records associated with the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications cleared successfully.',
    schema: {
      example: {
        success: true,
        message: 'All notifications deleted successfully',
      },
    },
  })
  @Delete()
  async removeAll(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const notification = await this.notificationService.removeAll(user_id);
      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Mark a Specific Notification as Read (User Only)',
    description: 'Updates the read status of a single notification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully.',
    schema: {
      example: {
        success: true,
        message: 'Notification marked as read',
      },
    },
  })
  @Patch(':id/read')
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;
      const notification = await this.notificationService.markAsRead(
        id,
        user_id,
      );
      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Mark All My Notifications as Read (User Only)',
    description:
      'Updates the read status of all unread notifications for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully.',
    schema: {
      example: {
        success: true,
        message: 'All notifications marked as read',
      },
    },
  })
  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const notification =
        await this.notificationService.markAllAsRead(user_id);
      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
