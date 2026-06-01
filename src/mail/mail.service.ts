import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import appConfig from '../config/app.config';

@Injectable()
export class MailService {
  constructor(
    @InjectQueue('mail-queue') private queue: Queue,
    private mailerService: MailerService,
  ) {}

  async sendMemberInvitation({ user, member, url }) {
    try {
      const from = `${appConfig().mail.fromName} <${appConfig().mail.from}>`;
      const subject = `${user.fname} is inviting you to ${appConfig().app.name}`;

      // add to queue
      await this.queue.add('sendMemberInvitation', {
        to: member.email,
        from: from,
        subject: subject,
        template: 'member-invitation',
        context: {
          user: user,
          member: member,
          url: url,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  // send otp code for email verification
  async sendOtpCodeToEmail({ name, email, otp }) {
    try {
      const from = `${appConfig().mail.fromName} <${appConfig().mail.from}>`;
      const subject = 'Email Verification';

      // add to queue
      await this.queue.add('sendOtpCodeToEmail', {
        to: email,
        from: from,
        subject: subject,
        template: 'email-verification',
        context: {
          name: name,
          otp: otp,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendVerificationLink(params: {
    email: string;
    name: string;
    token: string;
    type: string;
  }) {
    try {
      const verificationLink = `${appConfig().app.client_app_url}/verify-email?token=${params.token}&email=${params.email}&type=${params.type}`;

      // add to queue
      await this.queue.add('sendVerificationLink', {
        to: params.email,
        subject: 'Verify Your Email',
        template: './verification-link',
        context: {
          name: params.name,
          verificationLink,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendPractitionerCredentials({ name, email, password }) {
    try {
      const from = `${appConfig().mail.fromName} <${appConfig().mail.from}>`;
      const subject = `Your Practitioner Account Credentials`;

      // add to queue
      await this.queue.add('sendPractitionerCredentials', {
        to: email,
        from: from,
        subject: subject,
        template: 'practitioner-credentials',
        context: {
          name,
          email,
          password,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendPrescriptionAssignedEmail(params: {
    name: string;
    email: string;
    prescriptionTitle: string;
    totalVideos: number;
    videoTitles: string[];
  }) {
    try {
      const from = `${appConfig().mail.fromName} <${appConfig().mail.from}>`;
      const subject = `New Prescription: ${params.prescriptionTitle}`;

      await this.queue.add('sendPrescriptionAssignedEmail', {
        to: params.email,
        from,
        subject,
        template: 'prescription-assigned',
        context: {
          name: params.name,
          prescriptionTitle: params.prescriptionTitle,
          totalVideos: params.totalVideos,
          videoTitles: params.videoTitles,
          appName: appConfig().app.name,
          loginUrl: appConfig().app.client_app_url,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }
}
