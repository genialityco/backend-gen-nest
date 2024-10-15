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
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Module } from './interfaces/module.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<Module>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: Module[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.modulesService.findWithFilters(
      query,
      paginationDto,
    );
    return result.items.length > 0
      ? new ResponseDto('success', 'Módulos encontrados', result)
      : new ResponseDto('error', 'No se encontraron módulos');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Module>> {
    const result = await this.modulesService.findOne(id);
    return result
      ? new ResponseDto('success', 'Módulo encontrado', result)
      : new ResponseDto('error', 'No se encontró el módulo');
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: Module[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.modulesService.findAll(paginationDto);
    return result.items.length > 0
      ? new ResponseDto('success', 'Módulos encontrados', result)
      : new ResponseDto('error', 'No se encontraron módulos');
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createModuleDto: CreateModuleDto,
  ): Promise<ResponseDto<Module>> {
    const result = await this.modulesService.create(createModuleDto);
    return result
      ? new ResponseDto('success', 'Módulo creado', result)
      : new ResponseDto('error', 'No se pudo crear el módulo');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateModuleDto: UpdateModuleDto,
  ): Promise<ResponseDto<Module>> {
    const result = await this.modulesService.update(id, updateModuleDto);
    return result
      ? new ResponseDto('success', 'Módulo actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el módulo');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Module>> {
    const result = await this.modulesService.remove(id);
    return result
      ? new ResponseDto('success', 'Módulo eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el módulo');
  }
}
