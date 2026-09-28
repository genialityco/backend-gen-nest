import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as admin from 'firebase-admin';
import { Member } from 'src/member/interfaces/member.interface';
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
    @InjectModel('Member') private memberModel: Model<Member>,
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
      .find({ userId, showNotification: true })
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

  // Contar las notificaciones que se están mostrando (showNotification: true)
  async countVisibleNotifications(): Promise<number> {
    return this.notificationModel.countDocuments({ showNotification: true });
  }

  // Vaciar: ocultar todas las notificaciones visibles (showNotification: true -> false)
  async clearVisibleNotifications(): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { showNotification: true },
      { showNotification: false },
    );
    return result.modifiedCount;
  }

  // Envío individual de notificaciones push
  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data: any = {},
    iconUrl?: string,
  ): Promise<void> {
    const template = await this.notificationTemplateModel.findById(
      data.recordId,
    );
    if (!template) {
      throw new NotFoundError('Template not found');
    }
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: template.data,
      icon: iconUrl || this.defaultIconUrl,
    };
    console.log('data', data);
    try {
      // Crear y guardar la notificación en la base de datos
      const notificationData: CreateNotificationDto = {
        userId: data.userId,
        title,
        body,
        data: template.data,
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
  ): Promise<number> {
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

      return expoPushTokens.length;
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
      sentAt: new Date(),
    });

    return { message: 'Notifications sent successfully', totalSent };
  }

  // Cruza una lista de correos con los usuarios que tienen la app (push token).
  // Busca por el correo de la cuenta en Firebase y, de respaldo, por el correo del member.
  async resolveListRecipients(templateId: string, rawEmails: string[] = []) {
    const template = await this.notificationTemplateModel.findById(templateId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const unique = [
      ...new Set(
        rawEmails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean),
      ),
    ];
    const invalid = unique.filter((e) => !emailRegex.test(e));
    const emails = unique.filter((e) => emailRegex.test(e));

    const userByEmail = new Map<string, User>();

    // 1. Cuenta de Firebase -> user por firebaseUid
    const uidByEmail = new Map<string, string>();
    for (const batch of this.chunkArray(emails, 100)) {
      const res = await admin
        .auth()
        .getUsers(batch.map((email: string) => ({ email })));
      res.users.forEach((u) => {
        if (u.email) uidByEmail.set(u.email.toLowerCase(), u.uid);
      });
    }
    const usersByUid = await this.userModel
      .find({ firebaseUid: { $in: [...uidByEmail.values()] } })
      .exec();
    const userByUid = new Map(usersByUid.map((u) => [u.firebaseUid, u]));
    uidByEmail.forEach((uid, email) => {
      const u = userByUid.get(uid);
      if (u) userByEmail.set(email, u);
    });

    // 2. Respaldo: member de la organización con ese correo -> userId
    const pending = emails.filter((e) => !userByEmail.get(e)?.expoPushToken);
    if (pending.length) {
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const members = await this.memberModel
        .find({
          organizationId: template.organizationId,
          'properties.email': {
            $in: pending.map((e) => new RegExp(`^\\s*${escape(e)}\\s*$`, 'i')),
          },
        })
        .lean()
        .exec();
      const userIds = members
        .map((m) => String(m.userId || ''))
        .filter((id) => Types.ObjectId.isValid(id));
      const users = await this.userModel
        .find({ _id: { $in: userIds }, expoPushToken: { $nin: [null, ''] } })
        .exec();
      const userById = new Map(users.map((u) => [String(u._id), u]));
      members.forEach((m) => {
        const email = String(m.properties?.email || '').trim().toLowerCase();
        const u = userById.get(String(m.userId));
        if (u && !userByEmail.get(email)?.expoPushToken) {
          userByEmail.set(email, u);
        }
      });
    }

    const recipients: { email: string; userId: string; token: string }[] = [];
    const withoutApp: string[] = [];
    const sharedToken: string[] = [];
    const seenTokens = new Set<string>();
    emails.forEach((email) => {
      const u = userByEmail.get(email);
      if (!u?.expoPushToken) {
        withoutApp.push(email);
      } else if (seenTokens.has(u.expoPushToken)) {
        sharedToken.push(email);
      } else {
        seenTokens.add(u.expoPushToken);
        recipients.push({ email, userId: String(u._id), token: u.expoPushToken });
      }
    });

    return { template, recipients, withoutApp, invalid, sharedToken };
  }

  // Vista previa del envío por lista: no envía nada
  async previewList(templateId: string, emails: string[]) {
    const { recipients, withoutApp, invalid, sharedToken } =
      await this.resolveListRecipients(templateId, emails);
    return {
      totalEmails: recipients.length + withoutApp.length + invalid.length + sharedToken.length,
      withApp: recipients.map((r) => r.email),
      withoutApp,
      invalid,
      sharedToken,
    };
  }

  // Envía el template solo a los correos de la lista que tienen la app
  async sendTemplateToList(templateId: string, emails: string[]) {
    const { template, recipients, withoutApp, invalid, sharedToken } =
      await this.resolveListRecipients(templateId, emails);
    if (recipients.length === 0) {
      throw new BadRequestException(
        'Ningún correo de la lista tiene la aplicación instalada.',
      );
    }

    const { title, body, data } = template;
    await this.notificationModel.insertMany(
      recipients.map((r) => ({ userId: r.userId, title, body, data, isRead: false })),
    );

    const failed: { email: string; message: string }[] = [];
    let sent = 0;
    for (const batch of this.chunkArray(recipients, this.batchSize)) {
      const tickets = await this.postExpoBatch(
        batch.map((r: { token: string }) => r.token),
        title,
        body,
        data,
      );
      batch.forEach((r: { email: string }, i: number) => {
        const t = tickets[i];
        if (t?.status === 'ok') sent++;
        else failed.push({ email: r.email, message: t?.message || 'Sin respuesta de Expo' });
      });
    }

    // Se marca como enviado también para que el cron no lo reenvíe a todos
    await this.notificationTemplateModel.findByIdAndUpdate(templateId, {
      $inc: { totalSent: sent },
      isSent: true,
      sentAt: new Date(),
    });

    return { sent, failed, withoutApp, invalid, sharedToken };
  }

  // Envía un lote a Expo y devuelve los tickets en el mismo orden de los tokens
  private async postExpoBatch(
    expoPushTokens: string[],
    title: string,
    body: string,
    data: any = {},
  ): Promise<{ status: string; message?: string }[]> {
    const messages = expoPushTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      icon: this.defaultIconUrl,
    }));
    try {
      const response = await axios.post(this.expoPushUrl, messages, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error al enviar el lote de notificaciones:', error);
      return expoPushTokens.map(() => ({
        status: 'error',
        message: error?.message || 'Error de red con Expo',
      }));
    }
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
  async processScheduledNotifications(): Promise<
    NotificationTemplate[] | void
  > {
    try {
      const now = new Date();

      //console.log("⏰ Procesando notificaciones programadas a las:", now);
      // Buscar solo los que tienen scheduledAt definido, ya vencido, y no enviados
      const templates = await this.notificationTemplateModel.find({
        scheduledAt: { $exists: true, $lte: now },
        isSent: false,
      });
      //return templates;
      //console.log("Templates encontrados:", JSON.stringify(templates, null, 2));
      if (templates.length > 0) {
        for (const template of templates) {
          //console.log(`Enviando notificación programada: ${template.title}`);
          await this.sendFromTemplate(template._id.toString());
        }
        //  for (const template of templates) {
        //   console.log(`Enviando notificación programada: ${template.title}`);
        //   await this.sendPushNotification(

        //     "ExponentPushToken[_g4P3PCYK5upzQP-hJ7ejB]",
        //     template.title,
        //     template.body,
        //     {userId: "672aae62778fcbf45a20c475"},
        //     this.defaultIconUrl
        //   );
        //   await this.notificationTemplateModel.findByIdAndUpdate(template._id, {

        //   isSent: true, // Marcar como enviado
        // });
        // }
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
