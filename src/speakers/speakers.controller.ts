import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ValidationPipe,
  Res
} from '@nestjs/common';
import { SpeakersService } from './speakers.service';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { UpdateSpeakerDto } from './dto/update-speaker.dto';
import { Speaker } from './interfaces/speakers.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Response } from 'express';
@Controller('speakers')
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Get('search')
  async findWithFilters(
    @Query() filters: Partial<Speaker>,
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.speakersService.findWithFilters(
      filters,
      paginationDto,
    );
    return new ResponseDto('success', 'Speakers encontrados', result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Speaker>> {
    const result = await this.speakersService.findOne(id);
    return result
      ? new ResponseDto('success', 'Speaker encontrado', result)
      : new ResponseDto('error', 'No se encontró el speaker');
  }

  @Get()
  async findAll(
    @Res ({ passthrough: true }) res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('names_like') names_like:string,
  ): Promise<ResponseDto<any>> {

    
    const result = await this.speakersService.findAll(paginationDto,names_like);
    res.header('x-total-count',result.totalItems.toString());
    res.header('access-control-expose-headers','x-total-count');


    return new ResponseDto('success', 'Speakers encontrados', result);
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createSpeakerDto: CreateSpeakerDto,
  ): Promise<ResponseDto<Speaker>> {
    const result = await this.speakersService.create(createSpeakerDto);
    return result
      ? new ResponseDto('success', 'Speaker creado', result)
      : new ResponseDto('error', 'No se pudo crear el speaker');
  }

  @Patch(':id')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateSpeakerDto: UpdateSpeakerDto,
  ): Promise<ResponseDto<Speaker>> {
    const result = await this.speakersService.update(id, updateSpeakerDto);
    return result
      ? new ResponseDto('success', 'Speaker actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el speaker');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Speaker>> {
    const result = await this.speakersService.remove(id);
    return result
      ? new ResponseDto('success', 'Speaker eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el speaker');
  }
}
