import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSchema } from './schemas/notification.schema';
import { UserSchema } from 'src/user/schemas/user.schema';
import { NotificationTemplateSchema } from 'src/notification-template/schemas/notification-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Notification', schema: NotificationSchema },
      { name: 'User', schema: UserSchema },
      { name: 'NotificationTemplate', schema: NotificationTemplateSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
