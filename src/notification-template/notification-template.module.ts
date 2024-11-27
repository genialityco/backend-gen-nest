import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationTemplateController } from './notification-template.controller';
import { NotificationTemplateSchema } from './schemas/notification-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'NotificationTemplate', schema: NotificationTemplateSchema },
    ]),
  ],
  providers: [NotificationTemplateService],
  controllers: [NotificationTemplateController],
})
export class NotificationTemplateModule {}
