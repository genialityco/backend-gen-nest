import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { pdfAttachmentMessage } from '../email/pdf-attachment-message';
import { CertificateAdminController } from './certificate-admin.controller';
import { CertificateAdminSessionGuard } from './certificate-admin-session';
import { CertificateAdminService } from './certificate-admin.service';
import { CertificateEmailService } from './certificate-email.service';

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
