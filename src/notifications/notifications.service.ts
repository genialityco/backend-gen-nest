import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './interfaces/notification.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  private readonly defaultIconUrl =
    'https://firebasestorage.googleapis.com/v0/b/global-auth-49737.appspot.com/o/ICONO.png?alt=media&token=a79d3421-eaa7-422a-9fec-3b2371e07ea6';
  private readonly batchSize = 100; // Tamaño de lotes para envíos masivos

  constructor(
    @InjectModel('Notification') private readonly notificationModel: Model<Notification>,
  ) {}

  // Crear una nueva notificación en la base de datos
  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const newNotification = new this.notificationModel(createNotificationDto);
    return newNotification.save();
  }

  // Obtener todas las notificaciones de un usuario
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Marcar una notificación como leída
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true },
    );
  }

  // Marcar todas las notificaciones de un usuario como leídas
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  // Envío individual de notificaciones push
  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data: any = {},
    iconUrl?: string,
  ): Promise<void> {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      icon: iconUrl || this.defaultIconUrl,
    };

    try {
      const response = await axios.post(this.expoPushUrl, message, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });

      console.log('Notificación enviada correctamente:', response.data);
    } catch (error) {
      console.error('Error al enviar la notificación push:', error);
    }
  }

  // Envío masivo de notificaciones push
  async sendMassivePushNotifications(
    expoPushTokens: string[],
    title: string,
    body: string,
    data: any = {},
    iconUrl?: string,
  ): Promise<void> {
    const batches = this.chunkArray(expoPushTokens, this.batchSize);

    await Promise.all(
      batches.map((batch) =>
        this.sendPushNotificationBatch(batch, title, body, data, iconUrl),
      ),
    );
  }

  // Envía un lote de notificaciones push
  private async sendPushNotificationBatch(
    expoPushTokens: string[],
    title: string,
    body: string,
    data: any = {},
    iconUrl?: string,
  ): Promise<void> {
    const messages = expoPushTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      icon: iconUrl || this.defaultIconUrl,
    }));

    try {
      const response = await axios.post(this.expoPushUrl, messages, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });

      const { data: results } = response;
      results?.data?.forEach((result: any, index: number) => {
        if (result.status === 'error') {
          console.error(
            `Error al enviar a ${expoPushTokens[index]}: ${result.message}`,
          );
        }
      });
    } catch (error) {
      console.error('Error al enviar el lote de notificaciones:', error);
    }
  }

  // Función para dividir el array en lotes
  private chunkArray(array: any[], size: number): any[][] {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }
}
