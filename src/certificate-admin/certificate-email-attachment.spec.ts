import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as request from 'supertest';
import { pdfAttachmentMessage } from '../email/pdf-attachment-message';
import { CertificateAdminController } from './certificate-admin.controller';
import { CertificateAdminSessionGuard } from './certificate-admin-session';
import { CertificateAdminService } from './certificate-admin.service';
import { CertificateEmailService } from './certificate-email.service';
import {
  defaultEmailSettings,
  renderEmail,
  sanitizeEmailSettings,
} from './certificate-email.template';

describe('PDF adjunto al correo del certificado', () => {
  const password = 'test-certificate-session-password';
  const attendeeId = '66c123450000000000000001';
  const memberId = '66c123450000000000000002';
  const pdf = Buffer.concat([
    Buffer.from('%PDF-1.7\n'),
    Buffer.alloc(256, 0xef),
    Buffer.from('\n%%EOF'),
  ]);
  const url = `/certificate-admin/attendees/${attendeeId}/email`;
  const sendToAttendee = jest
    .fn()
    .mockResolvedValue({ status: 'sent', to: 'persona@example.com' });

  let app: INestApplication;
  let token: string;
  let previousPassword: string | undefined;

  beforeAll(async () => {
    previousPassword = process.env.CERTIFICATE_ADMIN_PASSWORD;
    process.env.CERTIFICATE_ADMIN_PASSWORD = password;
    const module = await Test.createTestingModule({
      controllers: [CertificateAdminController],
      providers: [
        CertificateAdminSessionGuard,
        { provide: CertificateAdminService, useValue: {} },
        { provide: CertificateEmailService, useValue: { sendToAttendee } },
      ],
    }).compile();
    app = await module.createNestApplication().init();
    const login = await request(app.getHttpServer())
      .post('/certificate-admin/session')
      .send({ password })
      .expect(201);
    token = login.body.data.token;
  });

  afterAll(async () => {
    if (previousPassword === undefined)
      delete process.env.CERTIFICATE_ADMIN_PASSWORD;
    else process.env.CERTIFICATE_ADMIN_PASSWORD = previousPassword;
    await app?.close();
  });

  beforeEach(() => sendToAttendee.mockClear());

  it('requiere una sesión del panel', async () => {
    await request(app.getHttpServer()).post(url).expect(401);
    expect(sendToAttendee).not.toHaveBeenCalled();
  });

  it('rechaza un archivo que no tiene firma PDF', async () => {
    await request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .field('memberId', memberId)
      .attach('certificate', Buffer.from('documento'), {
        filename: 'Certificado.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    expect(sendToAttendee).not.toHaveBeenCalled();
  });

  it('entrega los bytes del PDF al servicio de correo', async () => {
    await request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .field('memberId', memberId)
      .field('mode', 'pending')
      .attach('certificate', pdf, 'Certificado.pdf')
      .expect(201);
    expect(sendToAttendee).toHaveBeenCalledWith(
      attendeeId,
      pdf,
      'pending',
      memberId,
    );
  });

  it('conserva el PDF original dentro del mensaje MIME', () => {
    const message = pdfAttachmentMessage({
      to: 'persona@example.com',
      from: 'eventos@example.com',
      fromName: 'Educación Médica',
      subject: 'Certificación para María Gómez',
      html: '<p>Certificación</p>',
      text: 'Certificación',
      pdf,
    }).toString('ascii');
    const [, encodedPdf] = message.match(
      /Content-Disposition: attachment; filename="Certificado.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]+?)\r\n--/,
    );
    expect(Buffer.from(encodedPdf, 'base64')).toEqual(pdf);
    expect(encodedPdf.split('\r\n').every((line) => line.length <= 76)).toBe(
      true,
    );
  });
});

describe('Cuerpo del correo del certificado', () => {
  const eventName = '7° Congreso Latinoamericano de Cáncer de Piel';

  it('personaliza el asunto y el cuerpo en HTML y texto plano', () => {
    const settings = sanitizeEmailSettings(defaultEmailSettings());
    const { subject, html, text } = renderEmail(settings, {
      eventName,
      firstName: 'María',
      link: 'https://example.com/descarga',
    });

    expect(subject).toBe(`Tu certificado de ${eventName} está listo`);
    expect(html).toContain(`bgcolor="#222f59"`);
    expect(html).toContain('CERTIFICADO DE ASISTENTE');
    expect(html).toContain(
      `Gracias por participar en el <strong>${eventName}</strong>`,
    );
    expect(html).toContain('Hola, María:');
    expect(html).toContain('<strong>certificado en PDF</strong>');
    expect(text).toContain('Si tu nombre tiene algún error');
    expect(text).toContain('Cordialmente,\nComité Organizador');
    expect(html).not.toContain('https://example.com/descarga');
  });

  it('usa un saludo neutro cuando falta el nombre y escapa el nombre del evento en HTML', () => {
    const { html, text } = renderEmail(defaultEmailSettings(), {
      eventName: 'Salud & Comunidad <2026>',
      firstName: ' ',
    });
    expect(html).toContain('>Hola:</p>');
    expect(html).toContain('Salud &amp; Comunidad &lt;2026&gt;');
    expect(text).toContain('Hola:\n\n');
  });

  it('guarda el mensaje del certificado en el evento seleccionado', async () => {
    const eventA = new Types.ObjectId();
    const eventB = new Types.ObjectId();
    const certificates = [eventA, eventB].map((eventId) => ({
      _id: new Types.ObjectId(),
      eventId,
      hasDesign: true,
      emailSettings: defaultEmailSettings(),
    }));
    const updateOne = jest.fn((filter, { $set }) => ({
      exec: async () => {
        const saved = certificates.find(
          (certificate) =>
            certificate._id.equals(filter._id) &&
            certificate.eventId.equals(filter.eventId),
        );
        if (saved) saved.emailSettings = $set.emailSettings;
      },
    }));
    const service = new CertificateEmailService(
      null,
      { aggregate: () => ({ exec: async () => [] }) } as any,
      {
        aggregate: ([{ $match }]) => ({
          exec: async () =>
            certificates.filter((item) => item.eventId.equals($match.eventId)),
        }),
        updateOne,
      } as any,
      {
        findById: (id: Types.ObjectId) => ({
          lean: () => ({ exec: async () => ({ _id: id, name: eventName }) }),
        }),
      } as any,
      null,
    );
    const block = defaultEmailSettings().blocks[0];
    const settings = {
      ...defaultEmailSettings(),
      subject: 'Tu constancia del taller',
      blocks: [
        {
          ...block,
          title: 'Constancia del taller',
          greeting: 'Estimada {{fullName}}',
          message: 'Tu **constancia** va adjunta. <Gracias>',
          closing: '',
          signature: 'Equipo del taller',
          headerColor: '#226644',
        },
      ],
    };

    await service.saveSettings(eventA.toHexString(), settings);
    const first = await service.preview(eventA.toHexString(), undefined);
    const second = await service.preview(eventB.toHexString(), undefined);

    expect(updateOne).toHaveBeenCalledWith(
      { _id: certificates[0]._id, eventId: eventA },
      expect.anything(),
    );
    expect(first.subject).toBe('Tu constancia del taller');
    expect(first.html).toContain('bgcolor="#226644"');
    expect(first.html).toContain('Estimada María Fernanda Gómez');
    expect(first.html).toContain(
      'Tu <strong>constancia</strong> va adjunta. &lt;Gracias&gt;',
    );
    expect(first.text).toContain('Equipo del taller');
    expect(first.text).not.toContain('Cordialmente,');
    expect(second.html).toContain('Comité Organizador');
    expect(second.text).not.toContain('Equipo del taller');
  });
});
