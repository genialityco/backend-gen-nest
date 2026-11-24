// Copia del servicio de correo de GenCampus (geniality-renewed-backend/src/email)
// sobre AWS SES, con las mismas variables de entorno. Se omitió sendLayoutEmail
// porque depende de los modelos y plantillas de organizaciones de GenCampus.
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { pdfAttachmentMessage } from './pdf-attachment-message';

@Injectable()
export class EmailService {
  private ses: AWS.SES;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.ses = new AWS.SES({
      region: this.configService.get<string>('AWS_REGION'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
    this.from = this.configService.get<string>('AWS_SES_EMAIL_FROM');
    this.fromName =
      this.configService.get<string>('AWS_SES_EMAIL_FROM_NAME') || 'ACHO';
  }

  // ----------------- Helpers: limpieza y validación -----------------
  /** Remueve espacios/control invisibles y normaliza Unicode */
  private cleanEmail(email: string): string {
    if (typeof email !== 'string') return '';
    return email
      .normalize('NFKC')
      .trim()
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
      .replace(/\s+/g, '');
  }

  /** Regex sencilla y suficiente para SES (sin espacios) */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Limpia, valida y deduplica un conjunto de correos */
  private prepareAddressList(
    input?: string | string[],
    fieldName = 'to',
  ): string[] {
    if (!input) return [];
    const arr = Array.isArray(input) ? input : [input];

    const cleaned = arr
      .map((raw) => {
        const e = this.cleanEmail(raw);
        if (!this.isValidEmail(e)) {
          this.logger.warn(
            `Email inválido en "${fieldName}": "${raw}" -> "${e}"`,
          );
          throw new BadRequestException(
            `Correo inválido en "${fieldName}": ${raw}`,
          );
        }
        return e;
      })
      .filter(Boolean);

    return Array.from(new Set(cleaned)); // dedup
  }

  /** Construye el campo Source asegurando limpieza en el from */
  private buildSource(fromEmail: string, fromName: string): string {
    const cleanFrom = this.cleanEmail(fromEmail);
    if (!this.isValidEmail(cleanFrom)) {
      throw new BadRequestException(`FROM inválido: ${fromEmail}`);
    }
    // SES recomienda "Nombre" <email>
    const name = fromName || this.fromName;
    return `"${name}" <${cleanFrom}>`;
  }
  // ------------------------------------------------------------------

  // ======================
  // Envío básico (SendEmail)
  // ======================
  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    fromName?: string,
  ) {
    const source = this.buildSource(this.from, fromName || this.fromName);
    const toList = this.prepareAddressList(to, 'to');

    const params: AWS.SES.SendEmailRequest = {
      Source: source,
      Destination: { ToAddresses: toList },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    };

    try {
      const result = await this.ses.sendEmail(params).promise();
      this.logger.log(
        `Email enviado a ${toList.join(', ')} (MessageId: ${result.MessageId})`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Error enviando email a ${toList.join(', ')}: ${error?.message || error}`,
      );
      throw error;
    }
  }

  async sendPdfEmail(body: {
    to: string;
    subject: string;
    html: string;
    text: string;
    pdf: Buffer;
    fromName?: string;
    replyTo?: string;
  }) {
    const from = this.cleanEmail(this.from);
    if (!this.isValidEmail(from)) throw new BadRequestException('Remitente inválido');
    const [to] = this.prepareAddressList(body.to);
    const [replyTo] = this.prepareAddressList(body.replyTo, 'replyTo');
    const message = pdfAttachmentMessage({
      ...body,
      from,
      fromName: body.fromName || this.fromName,
      to,
      replyTo,
    });
    if (message.length > 10_000_000) {
      throw new BadRequestException('El correo con el PDF supera el tamaño admitido por SES');
    }
    return this.ses.sendRawEmail({ Source: from, Destinations: [to], RawMessage: { Data: message } }).promise();
  }

  // ======================
  // Universal (to/cc/bcc/fromName/fromEmail)
  // ======================
  async sendUniversalEmail(body: {
    to: string | string[];
    subject: string;
    html: string;
    fromName?: string;
    fromEmail?: string;
    cc?: string | string[];
    bcc?: string | string[];
    text?: string;
    replyTo?: string | string[];
  }) {
    const {
      to,
      cc,
      bcc,
      subject,
      html,
      fromName,
      fromEmail,
      text, // opcional
      replyTo,
    } = body ?? {};

    const source = this.buildSource(
      fromEmail || this.from,
      fromName || this.fromName,
    );

    const toList = this.prepareAddressList(to, 'to');
    const ccList = this.prepareAddressList(cc, 'cc');
    const bccList = this.prepareAddressList(bcc, 'bcc');
    const replyToList = this.prepareAddressList(replyTo, 'replyTo');

    if (toList.length === 0 && ccList.length === 0 && bccList.length === 0) {
      throw new BadRequestException(
        'Debe especificar al menos un destinatario (to/cc/bcc).',
      );
    }

    const message: AWS.SES.Message = {
      Subject: { Data: subject || '', Charset: 'UTF-8' },
      Body: {
        ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
        ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {}),
      },
    };

    const params: AWS.SES.SendEmailRequest = {
      Source: source,
      Destination: {
        ToAddresses: toList,
        CcAddresses: ccList.length ? ccList : undefined,
        BccAddresses: bccList.length ? bccList : undefined,
      },
      Message: message,
      ReplyToAddresses: replyToList.length ? replyToList : undefined,
    };

    try {
      this.logger.debug(`[Universal] Sending email with source: ${source}`);
      const result = await this.ses.sendEmail(params).promise();
      this.logger.log(
        `[Universal] Email enviado a ${[
          ...toList,
          ...ccList.map((e) => `cc:${e}`),
          ...bccList.map((e) => `bcc:${e}`),
        ].join(', ')} (MessageId: ${result.MessageId})`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `[Universal] Error enviando email: ${error?.message || error}`,
      );
      throw error;
    }
  }
}
