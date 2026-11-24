import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendee } from 'src/attendee/interfaces/attendee.interface';
import { Certificate } from 'src/certificate/interfaces/certificate.interface';
import { Member } from 'src/member/interfaces/member.interface';
import {
  CertificateEmailSettings,
  EMAIL_VARIABLES,
  defaultEmailSettings,
  renderEmail,
  sanitizeEmailSettings,
} from './certificate-email.template';
import { EmailService } from 'src/email/email.service';
import { normalizeEmail } from './certificate-admin.utils';

const EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
// Pausa entre correos de un envío masivo (SES limita los envíos por segundo)
const BULK_DELAY_MS = Number(process.env.EMAIL_BULK_DELAY_MS ?? 300);

export type SendResult =
  | { status: 'sent'; to: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

const titleCase = (value: string) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(
      /(^|\s)(\p{L})/gu,
      (_, space, letter) => space + letter.toUpperCase(),
    );

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// El diseño está habilitado cuando el certificado del evento tiene elementos
export const hasDesign = (certificate: any): boolean =>
  Boolean(
    certificate &&
      Array.isArray(certificate.elements) &&
      certificate.elements.length > 0,
  );

@Injectable()
export class CertificateEmailService {
  private readonly logger = new Logger(CertificateEmailService.name);
  // Eventos con un envío masivo en curso (evita dobles clics)
  private readonly runningEvents = new Set<string>();

  constructor(
    @InjectModel('Member') private memberModel: Model<Member>,
    @InjectModel('Attendee') private attendeeModel: Model<Attendee>,
    @InjectModel('Certificate') private certificateModel: Model<Certificate>,
    @InjectModel('Event') private eventModel: Model<any>,
    private readonly emailService: EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Envío (AWS SES, mismo servicio que GenCampus)
  // ---------------------------------------------------------------------------

  isConfigured(): boolean {
    return Boolean(
      process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_REGION &&
        process.env.AWS_SES_EMAIL_FROM,
    );
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'El correo no está configurado (faltan AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION y AWS_SES_EMAIL_FROM)',
      );
    }
  }

  private async deliver(
    to: string,
    settings: CertificateEmailSettings,
    vars: Record<string, string>,
  ) {
    this.assertConfigured();
    const { subject, html, text } = renderEmail(settings, vars);
    await this.emailService.sendUniversalEmail({
      to,
      subject,
      html,
      text,
      // Sin nombre configurado se usa AWS_SES_EMAIL_FROM_NAME
      fromName: settings.fromName || undefined,
      replyTo: settings.replyTo || undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------

  private async findCertificate(eventId: Types.ObjectId) {
    return this.certificateModel
      .findOne({ eventId })
      .sort({ updatedAt: -1 })
      .lean<any>()
      .exec();
  }

  private settingsOf(certificate: any): CertificateEmailSettings {
    return certificate?.emailSettings
      ? sanitizeEmailSettings(certificate.emailSettings)
      : defaultEmailSettings();
  }

  async getConfig(eventId: string) {
    const evId = this.toObjectId(eventId, 'eventId');
    const event = await this.eventModel
      .findById(evId, { name: 1 })
      .lean<any>()
      .exec();
    if (!event) throw new NotFoundException('No se encontró el evento');
    const certificate = await this.findCertificate(evId);

    return {
      event: { _id: event._id, name: event.name },
      certificateId: certificate?._id ?? null,
      hasDesign: hasDesign(certificate),
      emailConfigured: this.isConfigured(),
      sending: this.runningEvents.has(String(evId)),
      saved: Boolean(certificate?.emailSettings),
      settings: this.settingsOf(certificate),
      variables: EMAIL_VARIABLES,
      stats: await this.getStats(evId),
    };
  }

  async saveSettings(eventId: string, input: any) {
    const evId = this.toObjectId(eventId, 'eventId');
    const certificate = await this.findCertificate(evId);
    if (!certificate) {
      throw new BadRequestException(
        'Primero crea y guarda el diseño del certificado',
      );
    }
    const settings = sanitizeEmailSettings(input);
    if (settings.enabled && !hasDesign(certificate)) {
      throw new BadRequestException(
        'No se puede habilitar el envío: el certificado todavía no tiene diseño',
      );
    }
    await this.certificateModel
      .updateOne(
        { _id: certificate._id },
        { $set: { emailSettings: settings } },
      )
      .exec();
    return this.getConfig(eventId);
  }

  async preview(eventId: string, input: any) {
    const evId = this.toObjectId(eventId, 'eventId');
    const event = await this.eventModel
      .findById(evId, { name: 1 })
      .lean<any>()
      .exec();
    if (!event) throw new NotFoundException('No se encontró el evento');
    const certificate = await this.findCertificate(evId);
    const settings = input
      ? sanitizeEmailSettings(input)
      : this.settingsOf(certificate);
    return renderEmail(settings, this.sampleVars(settings, event.name));
  }

  private sampleVars(settings: CertificateEmailSettings, eventName: string) {
    return {
      fullName: 'María Fernanda Gómez',
      firstName: 'María',
      eventName: eventName ?? '',
      email: 'maria.gomez@correo.com',
      link: `${settings.linkBaseUrl}/descarga/ejemplo`,
    };
  }

  private async getStats(eventId: Types.ObjectId) {
    const [result] = await this.attendeeModel
      .aggregate([
        { $match: { eventId, attended: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: {
              $sum: {
                $cond: [{ $eq: ['$certificateEmail.status', 'sent'] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ['$certificateEmail.status', 'failed'] }, 1, 0],
              },
            },
          },
        },
      ])
      .exec();
    const total = result?.total ?? 0;
    const sent = result?.sent ?? 0;
    return { total, sent, failed: result?.failed ?? 0, pending: total - sent };
  }

  // ---------------------------------------------------------------------------
  // Envíos
  // ---------------------------------------------------------------------------

  async sendTest(eventId: string, to: string, input?: any) {
    const email = normalizeEmail(to);
    if (!EMAIL_REGEX.test(email))
      throw new BadRequestException('Correo de prueba inválido');
    const evId = this.toObjectId(eventId, 'eventId');
    const event = await this.eventModel
      .findById(evId, { name: 1 })
      .lean<any>()
      .exec();
    if (!event) throw new NotFoundException('No se encontró el evento');
    const certificate = await this.findCertificate(evId);
    if (!hasDesign(certificate)) {
      throw new BadRequestException('El certificado todavía no tiene diseño');
    }
    const settings = input
      ? sanitizeEmailSettings(input)
      : this.settingsOf(certificate);
    try {
      await this.deliver(
        email,
        settings,
        this.sampleVars(settings, event.name),
      );
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `No se pudo enviar: ${error?.message ?? 'error al enviar'}`,
      );
    }
    return { to: email };
  }

  // Envío a un asistente puntual (botón en la tabla). `requireEnabled` lo usan
  // los envíos automáticos/masivos; el manual solo exige el diseño.
  async sendToAttendee(
    attendeeId: string | Types.ObjectId,
    {
      requireEnabled = false,
      cache,
    }: { requireEnabled?: boolean; cache?: Map<string, any> } = {},
  ): Promise<SendResult> {
    const attendee = await this.attendeeModel
      .findById(
        typeof attendeeId === 'string'
          ? this.toObjectId(attendeeId, 'attendeeId')
          : attendeeId,
      )
      .lean<any>()
      .exec();
    if (!attendee) throw new NotFoundException('No se encontró el asistente');

    // El certificado y el evento se repiten en un envío masivo: se cachean
    const key = String(attendee.eventId);
    let context = cache?.get(key);
    if (!context) {
      const [certificate, event] = await Promise.all([
        this.findCertificate(attendee.eventId),
        this.eventModel
          .findById(attendee.eventId, { name: 1 })
          .lean<any>()
          .exec(),
      ]);
      context = { certificate, event, settings: this.settingsOf(certificate) };
      cache?.set(key, context);
    }
    const { certificate, event, settings } = context;

    if (!hasDesign(certificate)) {
      return {
        status: 'skipped',
        reason: 'El certificado todavía no tiene diseño',
      };
    }
    if (requireEnabled && !settings.enabled) {
      return {
        status: 'skipped',
        reason: 'El envío de correos está deshabilitado',
      };
    }
    if (!attendee.attended) {
      return {
        status: 'skipped',
        reason: 'El asistente no está habilitado para el certificado',
      };
    }

    const member = attendee.memberId
      ? await this.memberModel.findById(attendee.memberId).lean<any>().exec()
      : null;
    const email = normalizeEmail(member?.properties?.email);
    if (!EMAIL_REGEX.test(email)) {
      return {
        status: 'skipped',
        reason: 'El miembro no tiene un correo válido',
      };
    }

    const fullName = titleCase(member?.properties?.fullName ?? '');
    const vars = {
      fullName,
      firstName: fullName.split(' ')[0] ?? '',
      eventName: event?.name ?? '',
      email,
      link: `${settings.linkBaseUrl}/descarga/${attendee._id}`,
    };

    try {
      await this.deliver(email, settings, vars);
      await this.attendeeModel
        .updateOne(
          { _id: attendee._id },
          {
            $set: {
              'certificateEmail.status': 'sent',
              'certificateEmail.sentAt': new Date(),
              'certificateEmail.to': email,
              'certificateEmail.error': '',
            },
            $inc: { 'certificateEmail.count': 1 },
          },
        )
        .exec();
      return { status: 'sent', to: email };
    } catch (error: any) {
      // Sin correo configurado no se marca como fallido: es un problema global
      if (error instanceof BadRequestException) throw error;
      const message = String(error?.message ?? 'Error al enviar').slice(0, 300);
      await this.attendeeModel
        .updateOne(
          { _id: attendee._id },
          {
            $set: {
              'certificateEmail.status': 'failed',
              'certificateEmail.error': message,
              'certificateEmail.failedAt': new Date(),
            },
          },
        )
        .exec();
      return { status: 'failed', error: message };
    }
  }

  // Envío automático después de inscribir asistentes. No bloquea la respuesta.
  queueAutoSend(eventId: Types.ObjectId, attendeeIds: string[]) {
    if (!attendeeIds.length || !this.isConfigured()) return;
    this.findCertificate(eventId)
      .then((certificate) => {
        const settings = this.settingsOf(certificate);
        if (!hasDesign(certificate) || !settings.enabled || !settings.autoSend)
          return;
        return this.runBatch(attendeeIds.map((id) => new Types.ObjectId(id)));
      })
      .catch((error) =>
        this.logger.error(`Envío automático falló: ${error?.message}`),
      );
  }

  // Envío masivo desde la interfaz: 'pending' = a quienes no se les ha enviado
  async sendToEvent(eventId: string, scope: 'pending' | 'all') {
    const evId = this.toObjectId(eventId, 'eventId');
    const certificate = await this.findCertificate(evId);
    if (!hasDesign(certificate)) {
      throw new BadRequestException('El certificado todavía no tiene diseño');
    }
    if (!this.settingsOf(certificate).enabled) {
      throw new BadRequestException(
        'Habilita y guarda el envío de correos antes de enviar',
      );
    }
    this.assertConfigured();
    if (this.runningEvents.has(String(evId))) {
      throw new BadRequestException(
        'Ya hay un envío en curso para este evento',
      );
    }

    const filter: Record<string, any> = { eventId: evId, attended: true };
    if (scope !== 'all') filter['certificateEmail.status'] = { $ne: 'sent' };
    const attendees = await this.attendeeModel
      .find(filter, { _id: 1 })
      .lean<any>()
      .exec();
    const ids = attendees.map((a) => a._id as Types.ObjectId);

    this.runningEvents.add(String(evId));
    this.runBatch(ids)
      .catch((error) =>
        this.logger.error(`Envío masivo falló: ${error?.message}`),
      )
      .finally(() => this.runningEvents.delete(String(evId)));

    return { queued: ids.length };
  }

  private async runBatch(ids: Types.ObjectId[]) {
    const cache = new Map<string, any>();
    const totals = { sent: 0, skipped: 0, failed: 0 };
    for (const id of ids) {
      try {
        const result = await this.sendToAttendee(id, {
          requireEnabled: true,
          cache,
        });
        totals[result.status]++;
      } catch (error: any) {
        totals.failed++;
        this.logger.warn(`Correo a attendee ${id} falló: ${error?.message}`);
      }
      if (BULK_DELAY_MS > 0) await sleep(BULK_DELAY_MS);
    }
    this.logger.log(
      `Correos de certificado: ${totals.sent} enviados, ${totals.skipped} omitidos, ${totals.failed} fallidos`,
    );
    return totals;
  }

  private toObjectId(value: string, name: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value))
      throw new BadRequestException(`${name} inválido`);
    return new Types.ObjectId(value);
  }
}
