import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {  UserSchema } from './schemas/user.schema';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MemberSchema } from 'src/member/schemas/member.schema';
import { AttendeeSchema } from 'src/attendee/schemas/attendee.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'User', schema: UserSchema },
      { name: 'Member', schema: MemberSchema },
      { name: 'Attendee', schema: AttendeeSchema },
  ])],
  providers: [UserService],
  controllers: [UserController],
  exports: [MongooseModule],
})
export class UserModule {}