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
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './interfaces/organization.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // Crear una nueva organización
  @Post()
  async create(
    @Body(new ValidationPipe()) createOrganizationDto: CreateOrganizationDto,
  ): Promise<ResponseDto<Organization>> {
    const result = await this.organizationService.create(createOrganizationDto);
    return new ResponseDto('success', 'Organización creada', result);
  }

  // Actualizar una organización por ID
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<ResponseDto<Organization>> {
    const result = await this.organizationService.update(
      id,
      updateOrganizationDto,
    );
    return new ResponseDto('success', 'Organización actualizada', result);
  }

  // Obtener todas las organizaciones con paginación
  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.organizationService.findAll(paginationDto);
    return new ResponseDto('success', 'Organizaciones encontradas', result);
  }

  // Buscar organizaciones con filtros
  @Get('search')
  async findWithFilters(
    @Query() query: Partial<Organization>,
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.organizationService.findWithFilters(
      query,
      paginationDto,
    );
    return new ResponseDto('success', 'Organizaciones encontradas', result);
  }

  // Obtener una organización por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Organization>> {
    const result = await this.organizationService.findOne(id);
    return new ResponseDto('success', 'Organización encontrada', result);
  }

  // Eliminar una organización por ID
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Organization>> {
    const result = await this.organizationService.remove(id);
    return new ResponseDto('success', 'Organización eliminada', result);
  }
}
