import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { MemberSchema } from './schemas/member.schema';
import { UserSchema } from 'src/user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }, { name: 'User', schema: UserSchema },]),
  ],
  controllers: [MemberController],
  providers: [MemberService],
})
export class MemberModule {}
