import { Module } from '@nestjs/common';
import { ClinikoService } from './cliniko.service';
import { ClinikoController } from './cliniko.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ClinikoController],
  providers: [ClinikoService],
  exports: [ClinikoService],
})
export class ClinikoModule {}
