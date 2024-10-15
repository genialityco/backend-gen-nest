import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { MemberSchema } from './schemas/member.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }])],
  controllers: [MemberController],
  providers: [MemberService],
})
export class MemberModule {}
