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
  } from '@nestjs/common';
  import { NotificationTemplateService } from './notification-template.service';
  import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
  import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
  import { NotificationTemplate } from './interfaces/notification-template.interface';
  import { ResponseDto } from 'src/common/response.dto';
  import { PaginationDto } from 'src/common/dto/pagination.dto';

  
  @Controller('notification-templates')
  export class NotificationTemplateController {
    constructor(
      private readonly notificationTemplateService: NotificationTemplateService,
    ) {}
  
    // Buscar plantillas con filtros dinámicos
    @Get('search')
    async findWithFilters(
      @Query() query: Partial<NotificationTemplate & { search?: string }>,
      @Query() paginationDto: PaginationDto,
    ): Promise<
      ResponseDto<{
        items: NotificationTemplate[];
        totalItems: number;
        totalPages: number;
        currentPage: number;
      }>
    > {
      const result = await this.notificationTemplateService.findWithFilters(
        paginationDto,
      );
  
      return result.items.length > 0
        ? new ResponseDto('success', 'Plantillas encontradas', result)
        : new ResponseDto('error', 'No se encontraron plantillas');
    }
  
    // Obtener todas las plantillas con paginación
    @Get()
    async findAll(
      @Query() paginationDto: PaginationDto,
    ) {
      console.log('📥 Query params recibidos:', paginationDto); // Debug
      
      const result = await this.notificationTemplateService.findWithFilters(
       
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
  
    // Obtener una plantilla por ID
    @Get(':id')
    async findOne(
      @Param('id') id: string,
    ): Promise<ResponseDto<NotificationTemplate>> {
      const result = await this.notificationTemplateService.findOne(id);
      return result
        ? new ResponseDto('success', 'Plantilla encontrada', result)
        : new ResponseDto('error', 'No se encontró la plantilla');
    }
  
    // Crear una nueva plantilla
    @Post()
    async create(
      @Body(new ValidationPipe()) createDto: CreateNotificationTemplateDto,
    ): Promise<ResponseDto<NotificationTemplate>> {
      const result = await this.notificationTemplateService.create(createDto);
      return result
        ? new ResponseDto('success', 'Plantilla creada', result)
        : new ResponseDto('error', 'No se pudo crear la plantilla');
    }
  
    // Actualizar una plantilla por ID
    @Patch(':id')
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body(new ValidationPipe()) updateDto: UpdateNotificationTemplateDto,
    ): Promise<ResponseDto<NotificationTemplate>> {
      const result = await this.notificationTemplateService.update(id, updateDto);
      return result
        ? new ResponseDto('success', 'Plantilla actualizada', result)
        : new ResponseDto('error', 'No se pudo actualizar la plantilla');
    }
  
    // Eliminar una plantilla por ID
    @Delete(':id')
    async remove(
      @Param('id') id: string,
    ): Promise<ResponseDto<NotificationTemplate>> {
      const result = await this.notificationTemplateService.remove(id);
      return result
        ? new ResponseDto('success', 'Plantilla eliminada', result)
        : new ResponseDto('error', 'No se pudo eliminar la plantilla');
    }
  
    // Incrementar el contador de envíos de una plantilla
    @Post(':id/increment-sent')
    async incrementTotalSent(
      @Param('id') id: string,
    ): Promise<ResponseDto<NotificationTemplate>> {
      try {
        const result = await this.notificationTemplateService.incrementTotalSent(
          id,
        );
        return new ResponseDto(
          'success',
          'Contador de envíos incrementado',
          result,
        );
      } catch (error) {
        return new ResponseDto('error', error.message);
      }
    }
  }
  