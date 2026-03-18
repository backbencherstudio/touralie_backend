import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async findAll(user_id: string, query: QueryNotificationDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const skip = (page - 1) * limit;

      const notifications = await this.prisma.notification.findMany({
        where: {
          receiver_id: user_id,
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
          receiver_id: user_id,
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
        where: { id, receiver_id: user_id },
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
      await this.prisma.notification.updateMany({
        where: {
          receiver_id: user_id,
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
      const notification = await this.prisma.notification.findUnique({
        where: {
          id: id,
          receiver_id: user_id,
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
      await this.prisma.notification.deleteMany({
        where: {
          receiver_id: user_id,
        },
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
