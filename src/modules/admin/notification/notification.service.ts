import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { ADMIN_ACCESS_ROLES, Role } from '../../../common/guard/role/role.enum';

import { QueryNotificationDto } from './dto/query-notification.dto';
import { Prisma } from 'prisma/generated/browser';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
  ) {}

  async findAll(user_id: string, query: QueryNotificationDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const skip = (page - 1) * limit;

      const where_condition: Prisma.NotificationWhereInput = {};
      const userDetails = await this.userRepository.getUserDetails(user_id);

      if (ADMIN_ACCESS_ROLES.includes(userDetails.type as Role)) {
        where_condition['OR'] = [
          { receiver_id: { equals: user_id } },
          { receiver_id: { equals: null } },
        ];
      } else {
        where_condition['receiver_id'] = user_id;
      }

      const notifications = await this.prisma.notification.findMany({
        where: {
          ...where_condition,
        },
        select: {
          id: true,
          created_at: true,
          read_at: true,
          notification_event: {
            select: {
              type: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip: skip,
        take: limit,
      });

      const total = await this.prisma.notification.count({
        where: {
          ...where_condition,
        },
      });

      const formattedNotifications = notifications.map((n) => ({
        id: n.id,
        title: n.notification_event?.title,
        description: n.notification_event?.description,
        type: n.notification_event?.type,
        is_read: n.read_at ? true : false,
        created_at: n.created_at,
      }));

      return {
        success: true,
        data: formattedNotifications,
        meta_data: {
          page,
          limit,
          total,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async markAsRead(id: string, user_id: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.update({
        where: { id },
        data: {
          read_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async markAllAsRead(user_id: string) {
    try {
      const userDetails = await this.userRepository.getUserDetails(user_id);

      const where_condition: Prisma.NotificationWhereInput = {};

      if (ADMIN_ACCESS_ROLES.includes(userDetails.type as Role)) {
        where_condition['OR'] = [
          { receiver_id: { equals: user_id } },
          { receiver_id: { equals: null } },
        ];
      } else {
        where_condition['receiver_id'] = user_id;
      }
      await this.prisma.notification.updateMany({
        where: {
          ...where_condition,
          read_at: null,
        },
        data: {
          read_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'All notifications marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string, user_id: string) {
    try {
      // check if notification exists
      const notification = await this.prisma.notification.findUnique({
        where: {
          id: id,
          // receiver_id: user_id,
        },
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.delete({
        where: {
          id: id,
        },
      });

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeAll(user_id: string) {
    try {
      const userDetails = await this.userRepository.getUserDetails(user_id);

      let where_condition: Prisma.NotificationWhereInput = {};

      if (ADMIN_ACCESS_ROLES.includes(userDetails.type as Role)) {
        where_condition['OR'] = [
          { receiver_id: { equals: user_id } },
          { receiver_id: { equals: null } },
        ];
      } else {
        where_condition['receiver_id'] = user_id;
      }
      // check if notification exists
      const notifications = await this.prisma.notification.findMany({
        where: where_condition,
      });

      if (notifications.length == 0) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.deleteMany({
        where: where_condition,
      });

      return {
        success: true,
        message: 'All notifications deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
