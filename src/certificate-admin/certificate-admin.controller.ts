import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ResponseDto } from '../common/response.dto';
import { CertificateAdminSessionGuard, createCertificateAdminSession } from './certificate-admin-session';
import { CertificateAdminService } from './certificate-admin.service';
import { CertificateEmailService } from './certificate-email.service';
import {
  BulkAttendeesDto,
  CertificateEmailUploadDto,
  CompleteIdNumberDto,
  EmailRecipientsQueryDto,
  EmailSettingsBodyDto,
  TestEmailUploadDto,
  UpdateAttendeeDataDto,
  UpdateMemberPropertiesDto,
} from './dto/certificate-admin.dto';

const CertificatePdfUpload = FileInterceptor('certificate', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 },
});

function certificatePdf(file?: Express.Multer.File): Buffer {
  if (file?.mimetype !== 'application/pdf' || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new BadRequestException('Adjunta el certificado generado en formato PDF');
  }
  return file.buffer;
}

@Controller('certificate-admin')
export class CertificateAdminController {
  constructor(
    private readonly service: CertificateAdminService,
    private readonly emailService: CertificateEmailService,
  ) {}

  // --- Administración -------------------------------------------------------

  @Post('session')
  createSession(@Body('password') password: string) {
    return new ResponseDto('success', 'Sesión iniciada', createCertificateAdminSession(password));
  }

  @Get('organizations/:organizationId/events')
  async organizationEvents(@Param('organizationId') organizationId: string): Promise<ResponseDto<any>> {
    const items = await this.service.getOrganizationEvents(organizationId);
    return new ResponseDto('success', 'Eventos encontrados', { items });
  }

  @Get('organizations/:organizationId/members')
  async organizationMembers(
    @Param('organizationId') organizationId: string,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.searchOrganizationMembers(organizationId, {
      q,
      page,
      limit,
      sort,
    });
    return new ResponseDto('success', 'Miembros encontrados', result);
  }

  @Get('events/:eventId')
  async eventOverview(@Param('eventId') eventId: string): Promise<ResponseDto<any>> {
    const result = await this.service.getEventOverview(eventId);
    return new ResponseDto('success', 'Evento encontrado', result);
  }

  @Get('events/:eventId/attendees')
  async eventAttendees(
    @Param('eventId') eventId: string,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.listEventAttendees(eventId, { q, page, limit });
    return new ResponseDto('success', 'Asistentes encontrados', result);
  }

  @Post('events/:eventId/attendees/bulk')
  async bulkAttendees(
    @Param('eventId') eventId: string,
    @Body(new ValidationPipe({ transform: true })) body: BulkAttendeesDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.bulkUpsertAttendees(eventId, body.rows);
    return new ResponseDto('success', 'Carga procesada', result);
  }

  @Get('members/:memberId')
  async memberDetail(@Param('memberId') memberId: string): Promise<ResponseDto<any>> {
    const result = await this.service.getMemberDetail(memberId);
    return new ResponseDto('success', 'Miembro encontrado', result);
  }

  @Put('members/:memberId')
  async updateMember(
    @Param('memberId') memberId: string,
    @Body(new ValidationPipe()) body: UpdateMemberPropertiesDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.updateMemberProperties(memberId, body);
    return new ResponseDto('success', 'Miembro actualizado', result);
  }

  @Put('attendees/:attendeeId')
  async updateAttendee(
    @Param('attendeeId') attendeeId: string,
    @Body(new ValidationPipe()) body: UpdateAttendeeDataDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.updateAttendeeData(attendeeId, body);
    return new ResponseDto('success', 'Certificado actualizado', result);
  }

  // --- Correo del certificado ---------------------------------------------

  @Get('events/:eventId/email')
  async emailConfig(@Param('eventId') eventId: string): Promise<ResponseDto<any>> {
    const result = await this.emailService.getConfig(eventId);
    return new ResponseDto('success', 'Configuración del correo', result);
  }

  @Put('events/:eventId/email')
  @UseGuards(CertificateAdminSessionGuard)
  async saveEmailConfig(
    @Param('eventId') eventId: string,
    @Body(new ValidationPipe()) body: EmailSettingsBodyDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.emailService.saveSettings(eventId, body.settings);
    return new ResponseDto('success', 'Correo guardado', result);
  }

  @Post('events/:eventId/email/preview')
  async previewEmail(
    @Param('eventId') eventId: string,
    @Body() body: EmailSettingsBodyDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.emailService.preview(eventId, body?.settings);
    return new ResponseDto('success', 'Vista previa', result);
  }

  @Post('events/:eventId/email/test')
  @UseGuards(CertificateAdminSessionGuard)
  @UseInterceptors(CertificatePdfUpload)
  async testEmail(
    @Param('eventId') eventId: string,
    @Body(new ValidationPipe()) body: TestEmailUploadDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResponseDto<any>> {
    const pdf = certificatePdf(file);
    let settings: unknown;
    if (body.settings) {
      try {
        settings = JSON.parse(body.settings);
      } catch {
        throw new BadRequestException('La configuración del correo no es válida');
      }
    }
    const result = await this.emailService.sendTest(eventId, body.to, pdf, settings);
    return new ResponseDto('success', 'Correo de prueba enviado', result);
  }

  @Get('events/:eventId/email/recipients')
  @UseGuards(CertificateAdminSessionGuard)
  async eventEmailRecipients(
    @Param('eventId') eventId: string,
    @Query(new ValidationPipe()) query: EmailRecipientsQueryDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.emailService.getEventRecipients(eventId, query.scope ?? 'pending', query.after);
    return new ResponseDto('success', 'Certificados pendientes de procesar', result);
  }

  @Post('attendees/:attendeeId/email')
  @UseGuards(CertificateAdminSessionGuard)
  @UseInterceptors(CertificatePdfUpload)
  async sendAttendeeEmail(
    @Param('attendeeId') attendeeId: string,
    @Body(new ValidationPipe()) body: CertificateEmailUploadDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResponseDto<any>> {
    const result = await this.emailService.sendToAttendee(attendeeId, certificatePdf(file), body.mode ?? 'manual', body.memberId);
    return new ResponseDto('success', 'Envío de certificado procesado', result);
  }

  // --- Público --------------------------------------------------------------

  @Put('public/attendees/:attendeeId/id-number')
  async completeIdNumber(
    @Param('attendeeId') attendeeId: string,
    @Body(new ValidationPipe()) body: CompleteIdNumberDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.completeIdNumber(attendeeId, body.idNumber);
    return new ResponseDto('success', 'Documento registrado', result);
  }

  @Get('public/organizations/:organizationId/search')
  async publicSearch(
    @Param('organizationId') organizationId: string,
    @Query('q') q: string,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.publicSearch(organizationId, q);
    return new ResponseDto('success', result.status, result);
  }

  @Get('public/render/:attendeeId')
  async renderData(@Param('attendeeId') attendeeId: string): Promise<ResponseDto<any>> {
    const result = await this.service.getRenderData(attendeeId);
    return new ResponseDto('success', 'Certificado', result);
  }

  @Get('public/render/:eventOrCertificateId/:userOrMemberId')
  async legacyRenderData(
    @Param('eventOrCertificateId') eventOrCertificateId: string,
    @Param('userOrMemberId') userOrMemberId: string,
  ): Promise<ResponseDto<any>> {
    const result = await this.service.getLegacyRenderData(eventOrCertificateId, userOrMemberId);
    return new ResponseDto('success', 'Certificado', result);
  }
}
