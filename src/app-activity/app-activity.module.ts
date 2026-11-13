import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppActivityController } from './app-activity.controller';
import { AppActivityService } from './app-activity.service';
import { AppActivityDaySchema, AppActivityStateSchema } from './schemas/app-activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AppActivityDay', schema: AppActivityDaySchema },
      { name: 'AppActivityState', schema: AppActivityStateSchema },
    ]),
  ],
  providers: [AppActivityService],
  controllers: [AppActivityController],
  exports: [AppActivityService],
})
export class AppActivityModule {}
