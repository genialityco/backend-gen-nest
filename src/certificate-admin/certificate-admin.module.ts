import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from 'src/email/email.module';
import { MemberSchema } from 'src/member/schemas/member.schema';
import { UserSchema } from 'src/user/schemas/user.schema';
import { AttendeeSchema } from 'src/attendee/schemas/attendee.schema';
import { CertificateSchema } from 'src/certificate/schemas/certificate.schema';
import { EventSchema } from 'src/event/schemas/event.schema';
import { CertificateAdminController } from './certificate-admin.controller';
import { CertificateAdminService } from './certificate-admin.service';
import { CertificateEmailService } from './certificate-email.service';
import { CertificateAdminSessionGuard } from './certificate-admin-session';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([
      { name: 'Member', schema: MemberSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Attendee', schema: AttendeeSchema },
      { name: 'Certificate', schema: CertificateSchema },
      { name: 'Event', schema: EventSchema },
    ]),
  ],
  controllers: [CertificateAdminController],
  providers: [CertificateAdminService, CertificateEmailService, CertificateAdminSessionGuard],
})
export class CertificateAdminModule {}
