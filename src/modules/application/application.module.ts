import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { PrescriptionModule } from './prescription/prescription.module';
import { MembershipModule } from './membership/membership.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [NotificationModule, ContactModule, FaqModule, PrescriptionModule, MembershipModule, LibraryModule],
})
export class ApplicationModule {}
