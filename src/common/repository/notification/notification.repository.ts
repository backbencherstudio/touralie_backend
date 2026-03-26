import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

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
      | 'package'
      | 'blog';
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
    }

    return notification;
  }
}
