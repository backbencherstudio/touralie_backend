import * as admin from 'firebase-admin';
import appConfig from '../../../config/app.config';

export class PushNotificationService {
  private static instance: admin.app.App;

  private static init() {
    const config = appConfig().firebase;
    if (!config.projectId || !config.clientEmail || !config.privateKey) {
      return null;
    }

    if (!admin.apps.length) {
      this.instance = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
      });
    } else {
      this.instance = admin.app();
    }
    return this.instance;
  }

  static isConfigured() {
    return this.init() !== null;
  }

  static async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: any,
  ) {
    const app = this.init();
    if (!app) {
      return {
        success: false,
        code: 'messaging/not-configured',
      };
    }

    try {
      const message: admin.messaging.Message = {
        token: token,
        notification: {
          title: title,
          body: body,
        },
      };

      if (data) {
        // FCM data must be strings
        const stringifiedData = {};
        Object.keys(data).forEach((key) => {
          stringifiedData[key] = String(data[key]);
        });
        message.data = stringifiedData;
      }

      const messageId = await app.messaging().send(message);
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return {
        success: false,
        code: error?.code || 'messaging/unknown-error',
        error,
      };
    }
  }
}
