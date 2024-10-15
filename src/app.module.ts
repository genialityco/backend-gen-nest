import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AttendeeModule } from './attendee/attendee.module';
import { CertificateModule } from './certificate/certificate.module';
import { EventModule } from './event/event.module';
import { OrganizationModule } from './organization/organization.module';
import { SpeakersModule } from './speakers/speakers.module';
import { DocumentsModule } from './documents/documents.module';
import { initializeFirebaseAdmin } from './config/firebase-admin.config';
import { AgendaModule } from './agenda/agenda.module';
import { ModulesModule } from './modules/modules.module';
import { RoomsModule } from './rooms/rooms.module';
import { UserModule } from './user/user.module';
import { MemberModule } from './member/member.module';
import { SurveyModule } from './survey/survey.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI), 
    AttendeeModule,
    CertificateModule,
    EventModule,
    OrganizationModule,
    SpeakersModule,
    DocumentsModule,
    AgendaModule,
    ModulesModule,
    RoomsModule,
    UserModule,
    MemberModule,
    SurveyModule,
  ],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {
    initializeFirebaseAdmin();
  }
}
