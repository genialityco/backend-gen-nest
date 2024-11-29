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
import { SurveyService } from './survey.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { Survey } from './interfaces/survey.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('surveys')
export class SurveyController {
  constructor(private readonly SurveyService: SurveyService) {}

  @Get('search')
  async findWithFilters(
    @Query() filters: Partial<Survey>,
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.SurveyService.findWithFilters(
      filters,
      paginationDto,
    );
    return new ResponseDto('success', 'Surveys found', result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Survey>> {
    const result = await this.SurveyService.findOne(id);
    return result
      ? new ResponseDto('success', 'Survey found', result)
      : new ResponseDto('error', 'Survey not found');
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.SurveyService.findAll(paginationDto);
    return new ResponseDto('success', 'Surveys found', result);
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createSurveyDto: CreateSurveyDto,
  ): Promise<ResponseDto<Survey>> {
    const result = await this.SurveyService.create(createSurveyDto);
    return result
      ? new ResponseDto('success', 'Survey created', result)
      : new ResponseDto('error', 'Survey could not be created');
  }

  @Patch(':id')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateSurveyDto: UpdateSurveyDto,
  ): Promise<ResponseDto<Survey>> {
    const result = await this.SurveyService.update(id, updateSurveyDto);
    return result
      ? new ResponseDto('success', 'Survey updated', result)
      : new ResponseDto('error', 'Survey could not be updated');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Survey>> {
    const result = await this.SurveyService.remove(id);
    return result
      ? new ResponseDto('success', 'Survey deleted', result)
      : new ResponseDto('error', 'Survey could not be deleted');
  }
}
