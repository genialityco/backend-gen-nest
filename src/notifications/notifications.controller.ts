import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Crear una notificación en la base de datos
  @Post('create')
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.createNotification(createNotificationDto);
  }

  // Obtener las notificaciones de un usuario
  @Get(':userId')
  async getUserNotifications(@Param('userId') userId: string) {
    return this.notificationsService.getUserNotifications(userId);
  }

  // Marcar una notificación como leída
  @Put(':notificationId/read')
  async markAsRead(@Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }

  // Marcar todas las notificaciones de un usuario como leídas
  @Put(':userId/mark-all-read')
  async markAllAsRead(@Param('userId') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return {
      message: 'Todas las notificaciones han sido marcadas como leídas.',
    };
  }

  // Envío individual de notificación push
  @Post('send')
  async sendNotification(@Body() payload: any): Promise<void> {
    const { expoPushToken, title, body, data, iconUrl } = payload;

    await this.notificationsService.sendPushNotification(
      expoPushToken,
      title,
      body,
      data,
      iconUrl,
    );
  }

  // Envío masivo de notificaciones push
  @Post('send-massive')
  async sendMassiveNotification(@Body() payload: any): Promise<void> {
    const { title, body, data, iconUrl } = payload;

    // if (!expoPushTokens || expoPushTokens.length === 0) {
    //   throw new Error('No se proporcionaron tokens de notificación.');
    // }

    await this.notificationsService.sendMassivePushNotifications(
      title,
      body,
      data,
      iconUrl,
    );
  }
}
