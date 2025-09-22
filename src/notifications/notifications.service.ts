import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './interfaces/notification.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import axios from 'axios';
import { User } from 'src/user/interfaces/user.interface';
import { NotFoundError } from 'rxjs';
import { NotificationTemplate } from 'src/notification-template/interfaces/notification-template.interface';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  //private readonly expoPushUrl = '';
  private readonly defaultIconUrl =
    'https://firebasestorage.googleapis.com/v0/b/global-auth-49737.appspot.com/o/ICONO.png?alt=media&token=a79d3421-eaa7-422a-9fec-3b2371e07ea6';
  private readonly batchSize = 100; // Tamaño de lotes para envíos masivos

  constructor(
    @InjectModel('Notification')
    private readonly notificationModel: Model<Notification>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('NotificationTemplate')
    private notificationTemplateModel: Model<NotificationTemplate>,
  ) {}

  // Crear una nueva notificación en la base de datos
  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
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
      // Crear y guardar la notificación en la base de datos
      const notificationData: CreateNotificationDto = {
        userId: data.userId,
        title,
        body,
        data,
        isRead: false,
      };
      await this.createNotification(notificationData);
      
      // Enviar la notificación push
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
    title: string,
    body: string,
    data: any = {},
    iconUrl?: string,
  ): Promise<void> {
    try {
      const usersExpoToken = await this.userModel
        .find({ expoPushToken: { $exists: true, $ne: null } })
        .exec();
      const expoPushTokens = usersExpoToken
        .map((user) => user.expoPushToken)
        .filter((token) => token);

      if (expoPushTokens.length === 0) {
        throw new NotFoundError('No se encontraron tokens de notificación.');
      }

      // Guardar la notificación en la base de datos para cada usuario
      await Promise.all(
        usersExpoToken.map(async (user) => {
          const notificationData: CreateNotificationDto = {
            userId: user._id as string,
            title,
            body,
            data,
            isRead: false,
          };
          await this.createNotification(notificationData);
        }),
      );

      const batches = this.chunkArray(expoPushTokens, this.batchSize);
      console.log('Sending notifications in batches:', batches.length);

      await Promise.all(
        batches.map((batch, index) => {
          console.log(`Sending batch ${index + 1} with ${batch.length} tokens`);
          return this.sendPushNotificationBatch(
            batch,
            title,
            body,
            data,
            iconUrl,
          );
        }),
      );

      console.log('All notifications sent successfully');
    } catch (error) {
      console.error('Error sending massive push notifications:', error);
      throw new InternalServerErrorException(
        'Error sending massive push notifications',
      );
    }
  }

  async sendFromTemplate(templateId: string): Promise<any> {
    const template = await this.notificationTemplateModel.findById(templateId);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const { title, body, data } = template;

    // Enviar notificaciones masivas utilizando el servicio existente
    const totalSent = await this.sendMassivePushNotifications(
      title,
      body,
      data,
    );

    // Actualizar el campo `totalSent` en el template
    await this.notificationTemplateModel.findByIdAndUpdate(templateId, {
      totalSent,
      isSent: true, // Marcar como enviado
    });

    return { message: 'Notifications sent successfully', totalSent };
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
async processScheduledNotifications(): Promise<NotificationTemplate[] | void> {
    try {
       const nowInColombia = new Date(new Date().toLocaleString("en-US", {
      timeZone: "America/Bogota"
    }));
    console.log("⏰ Procesando notificaciones programadas a las:", nowInColombia);
      // Buscar solo los que tienen scheduledAt definido, ya vencido, y no enviados
      const templates = await this.notificationTemplateModel.find({
        scheduledAt: { $exists: true, $lte: nowInColombia },
        isSent: false,
      });
      //return templates;
      // for (const template of templates) {
      //   console.log(`Enviando notificación programada: ${template.title}`);
      //   await this.sendFromTemplate(template._id.toString());
      // }
      console.log("Templates encontrados:", JSON.stringify(templates, null, 2));
      if (templates.length > 0) {
       for (const template of templates) {
        console.log(`Enviando notificación programada: ${template.title}`);
        await this.sendPushNotification(

          "ExponentPushToken[_g4P3PCYK5upzQP-hJ7ejB]",
          template.title,
          template.body,
          {userId: "672aae62778fcbf45a20c475"},
          this.defaultIconUrl
        );
        await this.notificationTemplateModel.findByIdAndUpdate(template._id, {
       
        isSent: true, // Marcar como enviado
      });
      }
    }
    } catch (error) {
      console.error('Error al procesar notificaciones programadas:', error);
    }
  }
    @Cron(CronExpression.EVERY_MINUTE)
    async handleCron() {
      await this.processScheduledNotifications();
    }
}
