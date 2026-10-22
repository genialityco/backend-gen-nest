import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ResponseDto } from 'src/common/response.dto';
import { CertificateAdminService } from './certificate-admin.service';
import {
  BulkAttendeesDto,
  UpdateAttendeeDataDto,
  UpdateMemberPropertiesDto,
} from './dto/certificate-admin.dto';

@Controller('certificate-admin')
export class CertificateAdminController {
  constructor(private readonly service: CertificateAdminService) {}

  // --- Administración -------------------------------------------------------

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

  // --- Público --------------------------------------------------------------

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
