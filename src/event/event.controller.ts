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
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventInterface } from './interfaces/event.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<EventInterface>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: EventInterface[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.eventService.findWithFilters(
      query,
      paginationDto,
    );
    return result.items.length > 0
      ? new ResponseDto('success', 'Eventos encontrados', result)
      : new ResponseDto('error', 'No se encontraron eventos');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<EventInterface>> {
    const result = await this.eventService.findOne(id);
    return result
      ? new ResponseDto('success', 'Evento encontrado', result)
      : new ResponseDto('error', 'No se encontró el evento');
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: EventInterface[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.eventService.findAll(paginationDto);
    return result.items.length > 0
      ? new ResponseDto('success', 'Eventos encontrados', result)
      : new ResponseDto('error', 'No se encontraron eventos');
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createEventDto: CreateEventDto,
  ): Promise<ResponseDto<EventInterface>> {
    const result = await this.eventService.create(createEventDto);
    return result
      ? new ResponseDto('success', 'Evento creado', result)
      : new ResponseDto('error', 'No se pudo crear el evento');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateEventDto: UpdateEventDto,
  ): Promise<ResponseDto<EventInterface>> {
    const result = await this.eventService.update(id, updateEventDto);
    return result
      ? new ResponseDto('success', 'Evento actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el evento');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<EventInterface>> {
    const result = await this.eventService.remove(id);
    return result
      ? new ResponseDto('success', 'Evento eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el evento');
  }
}
