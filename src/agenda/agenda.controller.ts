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
import { AgendaService } from './agenda.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ResponseDto } from 'src/common/response.dto';
import { Agenda } from './interfaces/agenda.interface';

@Controller('agendas')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('search')
  async findWithFilters(
    @Query() filters: Partial<Agenda>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: Agenda[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.agendaService.findWithFilters(
      filters,
      paginationDto,
    );
    return result.items.length > 0
      ? new ResponseDto('success', 'Agendas encontradas', result)
      : new ResponseDto('error', 'No se encontraron agendas');
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto): Promise<
    ResponseDto<{
      items: Agenda[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.agendaService.findAll(paginationDto);
    return result.items.length > 0
      ? new ResponseDto('success', 'Agendas encontradas', result)
      : new ResponseDto('error', 'No se encontraron agendas');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Agenda>> {
    const result = await this.agendaService.findOne(id);
    return result
      ? new ResponseDto('success', 'Agenda encontrada', result)
      : new ResponseDto('error', 'No se encontró la agenda');
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createAgendaDto: CreateAgendaDto,
  ): Promise<ResponseDto<Agenda>> {
    const result = await this.agendaService.create(createAgendaDto);
    return result
      ? new ResponseDto('success', 'Agenda creada', result)
      : new ResponseDto('error', 'No se pudo crear la agenda');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateAgendaDto: UpdateAgendaDto,
  ): Promise<ResponseDto<Agenda>> {
    const result = await this.agendaService.update(id, updateAgendaDto);
    return result
      ? new ResponseDto('success', 'Agenda actualizada', result)
      : new ResponseDto('error', 'No se pudo actualizar la agenda');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Agenda>> {
    const result = await this.agendaService.remove(id);
    return result
      ? new ResponseDto('success', 'Agenda eliminada', result)
      : new ResponseDto('error', 'No se pudo eliminar la agenda');
  }
}
