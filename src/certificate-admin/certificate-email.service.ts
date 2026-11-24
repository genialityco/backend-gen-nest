import {
  BadRequestException,
  Injectable,
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
import { EmailService } from '../email/email.service';
import { normalizeEmail } from './certificate-admin.utils';

const EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const RECIPIENT_PAGE_SIZE = 50;
const SEND_LOCK_MS = 10 * 60 * 1000;
const pendingAttachment = {
  $or: [
    { 'certificateEmail.status': { $ne: 'sent' } },
    { 'certificateEmail.attachmentSentAt': null },
  ],
};

export type SendMode = 'manual' | 'auto' | 'pending' | 'all';

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

@Injectable()
export class CertificateEmailService {
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
    pdf: Buffer,
  ) {
    this.assertConfigured();
    const { subject, html, text } = renderEmail(settings, vars);
    await this.emailService.sendPdfEmail({
      to,
      subject,
      html,
      text,
      pdf,
      // Sin nombre configurado se usa AWS_SES_EMAIL_FROM_NAME
      fromName: settings.fromName || undefined,
      replyTo: settings.replyTo || undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------

  private async findCertificate(eventId: Types.ObjectId) {
    const [certificate] = await this.certificateModel
      .aggregate<{
        _id: Types.ObjectId;
        hasDesign: boolean;
        emailSettings?: unknown;
      }>([
        { $match: { eventId } },
        { $sort: { updatedAt: -1 } },
        { $limit: 1 },
        {
          $project: {
            emailSettings: 1,
            hasDesign: {
              $cond: [
                { $isArray: '$elements' },
                { $gt: [{ $size: '$elements' }, 0] },
                false,
              ],
            },
          },
        },
      ])
      .exec();
    return certificate;
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
      hasDesign: Boolean(certificate?.hasDesign),
      emailConfigured: this.isConfigured(),
      batchDelayMs: Math.max(
        0,
        Number(process.env.EMAIL_BULK_DELAY_MS ?? 300) || 0,
      ),
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
    if (settings.enabled && !certificate.hasDesign) {
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
                $cond: [
                  {
                    $and: [
                      { $eq: ['$certificateEmail.status', 'sent'] },
                      {
                        $ne: [
                          {
                            $ifNull: [
                              '$certificateEmail.attachmentSentAt',
                              null,
                            ],
                          },
                          null,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
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

  async sendTest(eventId: string, to: string, pdf: Buffer, input?: any) {
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
    if (!certificate?.hasDesign) {
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
        pdf,
      );
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `No se pudo enviar: ${error?.message ?? 'error al enviar'}`,
      );
    }
    return { to: email };
  }

  async sendToAttendee(
    attendeeId: string,
    pdf: Buffer,
    mode: SendMode,
    memberId: string,
  ): Promise<SendResult> {
    const attendee = await this.attendeeModel
      .findById(this.toObjectId(attendeeId, 'attendeeId'))
      .lean<any>()
      .exec();
    if (!attendee) throw new NotFoundException('No se encontró el asistente');
    if (String(attendee.memberId) !== memberId) {
      return {
        status: 'skipped',
        reason:
          'El miembro asociado al certificado cambió. Vuelve a generarlo.',
      };
    }

    const [certificate, event] = await Promise.all([
      this.findCertificate(attendee.eventId),
      this.eventModel
        .findById(attendee.eventId, { name: 1 })
        .lean<any>()
        .exec(),
    ]);
    const settings = this.settingsOf(certificate);

    if (!certificate?.hasDesign) {
      return {
        status: 'skipped',
        reason: 'El certificado todavía no tiene diseño',
      };
    }
    if (
      mode !== 'manual' &&
      (!settings.enabled || (mode === 'auto' && !settings.autoSend))
    ) {
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
      ? await this.memberModel
          .findById(attendee.memberId, {
            'properties.email': 1,
            'properties.fullName': 1,
          })
          .lean<any>()
          .exec()
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

    this.assertConfigured();
    const now = new Date();
    const lockUntil = new Date(now.getTime() + SEND_LOCK_MS);
    const lockField = 'certificateEmail.sendingUntil';
    const claimed = await this.attendeeModel
      .updateOne(
        {
          _id: attendee._id,
          memberId: attendee.memberId,
          attended: true,
          $and: [
            { $or: [{ [lockField]: null }, { [lockField]: { $lte: now } }] },
            ...(mode === 'pending' || mode === 'auto'
              ? [pendingAttachment]
              : []),
          ],
        },
        { $set: { [lockField]: lockUntil } },
      )
      .exec();
    if (claimed.modifiedCount !== 1) {
      return {
        status: 'skipped',
        reason: 'El certificado ya se envió o hay un envío en curso',
      };
    }

    const claim = { _id: attendee._id, [lockField]: lockUntil };
    try {
      await this.deliver(email, settings, vars, pdf);
    } catch (error: any) {
      const message = String(error?.message ?? 'Error al enviar').slice(0, 300);
      await this.attendeeModel
        .updateOne(claim, {
          $set: {
            'certificateEmail.status': 'failed',
            'certificateEmail.error': message,
            'certificateEmail.failedAt': new Date(),
          },
          $unset: { [lockField]: 1 },
        })
        .exec();
      return { status: 'failed', error: message };
    }
    const sentAt = new Date();
    await this.attendeeModel
      .updateOne(claim, {
        $set: {
          'certificateEmail.status': 'sent',
          'certificateEmail.sentAt': sentAt,
          'certificateEmail.attachmentSentAt': sentAt,
          'certificateEmail.to': email,
          'certificateEmail.error': '',
        },
        $inc: { 'certificateEmail.count': 1 },
        $unset: { [lockField]: 1 },
      })
      .exec();
    return { status: 'sent', to: email };
  }

  async getEventRecipients(
    eventId: string,
    scope: 'pending' | 'all',
    after?: string,
  ) {
    const evId = this.toObjectId(eventId, 'eventId');
    const certificate = await this.findCertificate(evId);
    if (!certificate?.hasDesign) {
      throw new BadRequestException('El certificado todavía no tiene diseño');
    }
    if (!this.settingsOf(certificate).enabled) {
      throw new BadRequestException(
        'Habilita y guarda el envío de correos antes de enviar',
      );
    }
    this.assertConfigured();
    const attendees = await this.attendeeModel
      .find(
        {
          eventId: evId,
          attended: true,
          ...(scope === 'pending' ? pendingAttachment : {}),
          ...(after ? { _id: { $gt: this.toObjectId(after, 'after') } } : {}),
        },
        { _id: 1 },
      )
      .sort({ _id: 1 })
      .limit(RECIPIENT_PAGE_SIZE + 1)
      .lean()
      .exec();
    const ids = attendees
      .slice(0, RECIPIENT_PAGE_SIZE)
      .map(({ _id }) => String(_id));
    return {
      ids,
      next:
        attendees.length > RECIPIENT_PAGE_SIZE
          ? ids[ids.length - 1]
          : undefined,
    };
  }

  private toObjectId(value: string, name: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value))
      throw new BadRequestException(`${name} inválido`);
    return new Types.ObjectId(value);
  }
}
