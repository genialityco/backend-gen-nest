import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendeeService } from './attendee.service';
import { AttendeeController } from './attendee.controller';
import { AttendeeSchema } from './schemas/attendee.schema';
import { AuthService } from 'src/auth/auth.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Attendee', schema: AttendeeSchema }])],
  controllers: [AttendeeController],
  providers: [AttendeeService, AuthService],
})
export class AttendeeModule {}
