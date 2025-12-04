import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { AttendeeService } from './attendee.service';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';
import { Attendee } from './interfaces/attendee.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('attendees')
export class AttendeeController {
  constructor(private readonly attendeeService: AttendeeService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<Attendee>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: Attendee[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.attendeeService.findWithFilters1(
      
      paginationDto,
    );
    return result.items.length > 0
      ? new ResponseDto('success', 'Asistentes encontrados', result)
      : new ResponseDto('error', 'No se encontraron asistentes');
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto): Promise<
    ResponseDto<{
      items: Attendee[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.attendeeService.findAll(paginationDto);
    return result.items.length > 0
      ? new ResponseDto('success', 'Asistentes encontrados', result)
      : new ResponseDto('error', 'No se encontraron asistentes');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Attendee>> {
    const result = await this.attendeeService.findOne(id);
    return result
      ? new ResponseDto('success', 'Asistente encontrado', result)
      : new ResponseDto('error', 'No se encontró el asistente');
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createAttendeeDto: CreateAttendeeDto,
  ): Promise<ResponseDto<Attendee>> {
    const result = await this.attendeeService.create(createAttendeeDto);
    return result
      ? new ResponseDto('success', 'Asistente creado', result)
      : new ResponseDto('error', 'No se pudo crear el asistente');
  }

  @Put('certificate-download')
  async incrementCertificateDownloads(
    @Body('attendeeId') attendeeId: string,
  ): Promise<ResponseDto<Attendee>> {
    try {
      const result = await this.attendeeService.incrementCertificateDownloads({
        attendeeId,
       
      });

      return result
        ? new ResponseDto('success', 'Descarga registrada', result)
        : new ResponseDto('error', 'No se encontró el asistente');
    } catch (error) {
      return new ResponseDto('error', error.message);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateAttendeeDto: UpdateAttendeeDto,
  ): Promise<ResponseDto<Attendee>> {
    const result = await this.attendeeService.update(id, updateAttendeeDto);
    return result
      ? new ResponseDto('success', 'Asistente actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el asistente');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Attendee>> {
    const result = await this.attendeeService.remove(id);
    return result
      ? new ResponseDto('success', 'Asistente eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el asistente');
  }
}
