import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { LibraryModule } from './library/library.module';
import { MembershipModule } from './membership/membership.module';
import { PrescriptionModule } from './prescription/prescription.module';
import { OverviewModule } from './overview/overview.module';

@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    UserModule,
    NotificationModule,
    LibraryModule,
    MembershipModule,
    PrescriptionModule,
    OverviewModule,
  ],
})
export class AdminModule {}
