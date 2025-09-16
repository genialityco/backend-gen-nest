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
  Patch,
} from '@nestjs/common';
import { HighlightsService } from './highlights.service';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { Highlight } from './interfaces/highlight.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { EventExistsDto } from './schemas/highlight.schema';


@Controller('highlights')
export class HighlightsController {
  constructor(private readonly highlightsService: HighlightsService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<Highlight>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: Highlight[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.highlightsService.findWithFilters(
      paginationDto,
    );
    return result.items.length > 0
      ? new ResponseDto('success', 'Highlights encontrados', result)
      : new ResponseDto('error', 'No se encontraron highlights');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Highlight>> {
    const result = await this.highlightsService.findOne(id);
    return result
      ? new ResponseDto('success', 'Highlight encontrado', result)
      : new ResponseDto('error', 'No se encontró el highlight');
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ) {
    console.log('📥 Query params recibidos:', paginationDto); // Debug
    
    const result = await this.highlightsService.findWithFilters(
     
      paginationDto,
      
    );

    return {
      data: {
        items: result.items,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      }
    };
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createHighlightDto: CreateHighlightDto,
  ): Promise<ResponseDto<Highlight>> {
    const result = await this.highlightsService.create(createHighlightDto);
    return result
      ? new ResponseDto('success', 'Highlight creado', result)
      : new ResponseDto('error', 'No se pudo crear el highlight');
  }

  @Patch(':id')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateHighlightDto: UpdateHighlightDto,
  ): Promise<ResponseDto<Highlight>> {
    const result = await this.highlightsService.update(id, updateHighlightDto);
    return result
      ? new ResponseDto('success', 'Highlight actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el highlight');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Highlight>> {
    const result = await this.highlightsService.remove(id);
    return result
      ? new ResponseDto('success', 'Highlight eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el highlight');
  }
@Post('event/exists')
async eventHasHighlights(
  @Body() body: EventExistsDto,
): Promise<ResponseDto<{ hasHighlights: any }>> {
  const hasHighlights = await this.highlightsService.eventHasHighlights(body.eventId);
  return new ResponseDto('success', 'Consulta realizada', { hasHighlights });
}}
