import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PushNotificationService } from '../../lib/Notification/PushNotificationService';

@Injectable()
export class NotificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}
  /**
   * Create a notification
   * @param sender_id - The ID of the user who fired the event
   * @param receiver_id - The ID of the user to notify
   * @param title - The title of the notification
   * @param description - The description of the notification
   * @param type - The type of the notification
   * @param entity_id - The ID of the entity related to the notification
   * @returns The created notification
   */
  async createNotification({
    sender_id,
    receiver_id,
    title,
    description,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    title?: string;
    description?: string;
    type?:
      | 'message'
      | 'comment'
      | 'review'
      | 'booking'
      | 'payment_transaction'
      | 'auth'
      | 'membership_lead'
      | 'prescription'
      | 'library'
      | 'media';
    entity_id?: string;
  }) {
    const notificationEventData = {};
    if (type) {
      notificationEventData['type'] = type;
    }
    if (title) {
      notificationEventData['title'] = title;
    }
    if (description) {
      notificationEventData['description'] = description;
    }
    const notificationEvent = await this.prisma.notificationEvent.create({
      data: {
        type: type,
        title: title,
        description: description,
        ...notificationEventData,
      },
    });

    const notificationData = {};
    if (sender_id) {
      notificationData['sender_id'] = sender_id;
    }
    if (receiver_id) {
      notificationData['receiver_id'] = receiver_id;
    }
    if (entity_id) {
      notificationData['entity_id'] = entity_id;
    }

    const notification = await this.prisma.notification.create({
      data: {
        notification_event_id: notificationEvent.id,
        ...notificationData,
      },
    });

    // Publish to Redis for WebSocket
    if (receiver_id) {
      const publishData = {
        id: notification.id,
        receiver_id: receiver_id,
        title: title,
        description: description,
        type: type,
        is_read: false,
        created_at: notification.created_at,
      };
      await this.redis.publish('notification', JSON.stringify(publishData));

      // Push Notification (FCM)
      try {
        const receiver = await this.prisma.user.findUnique({
          where: { id: receiver_id },
          select: { fcm_token: true },
        });

        if (receiver?.fcm_token) {
          const pushResult = await PushNotificationService.sendNotification(
            receiver.fcm_token,
            title || 'New Notification',
            description || '',
            publishData,
          );

          if (
            !pushResult?.success &&
            [
              'messaging/registration-token-not-registered',
              'messaging/invalid-registration-token',
            ].includes(pushResult?.code)
          ) {
            await this.prisma.user.update({
              where: { id: receiver_id },
              data: { fcm_token: null },
            });
          }
        }
      } catch (pushError) {
        console.error('Failed to send push notification:', pushError);
      }
    }

    return notification;
  }
}
