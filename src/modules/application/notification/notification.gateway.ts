import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { NotificationService } from './notification.service';
import appConfig from '../../../config/app.config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private redisPubClient: Redis;
  private redisSubClient: Redis;

  // Map to store connected clients
  private clients = new Map<string, string>(); // userId -> socketId

  constructor(private readonly notificationService: NotificationService) {}

  onModuleInit() {
    this.redisPubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient.subscribe('notification', (err) => {
      if (err) {
        console.error('Failed to subscribe to notification channel', err);
      }
    });

    this.redisSubClient.on('message', (channel, message) => {
      if (channel === 'notification') {
        const data = JSON.parse(message);
        const receiverId = data.receiver_id || data.userId;
        if (receiverId) {
          // Send only to the specific user room
          this.server.to(receiverId).emit('receiveNotification', {
            success: true,
            data: {
              id: data.id,
              title: data.title,
              description: data.description,
              type: data.type,
              is_read: data.is_read || false,
              created_at: data.created_at || new Date().toISOString(),
            },
          });
        }
      }
    });
  }

  afterInit(server: Server) {
    console.log('Websocket server started');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(userId);
      this.clients.set(userId, client.id);
      console.log(`User ${userId} connected and joined room ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = [...this.clients.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];
    if (userId) {
      this.clients.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('sendNotification')
  async handleNotification(@MessageBody() data: any) {
    console.log(`Received notification request: ${JSON.stringify(data)}`);
    // data should contain receiver_id, title, description, type, etc.
    const receiverId = data.receiver_id || data.userId;
    if (receiverId) {
      await this.redisPubClient.publish('notification', JSON.stringify(data));
    }
  }
}
