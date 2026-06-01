import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { MailProcessor } from './processors/mail.processor';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('mail.host'),
          port: +config.get('mail.port'),
          secure: config.get('mail.secure'),
          requireTLS: config.get('mail.requireTls'),
          tls: {
            rejectUnauthorized: config.get('mail.tlsRejectUnauthorized'),
          },
          auth: {
            user: config.get('mail.user'),
            pass: config.get('mail.password'),
          },
        },
        defaults: {
          from: `"${config.get('mail.fromName')}" <${config.get('mail.from')}>`,
        },
        template: {
          dir: process.cwd() + '/dist/mail/templates/',
          adapter: new EjsAdapter(),
          options: {},
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'mail-queue',
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
