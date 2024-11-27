import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { NotificationTemplate } from './interfaces/notification-template.interface';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class NotificationTemplateService {
  constructor(
    @InjectModel('NotificationTemplate')
    private readonly notificationTemplateModel: Model<NotificationTemplate>,
  ) {}

  // Crear una nueva plantilla de notificación
  async create(
    createDto: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    const newTemplate = new this.notificationTemplateModel(createDto);
    return newTemplate.save();
  }

  // Actualizar una plantilla de notificación por ID
  async update(
    id: string,
    updateDto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplate | null> {
    return this.notificationTemplateModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  // Obtener todas las plantillas con paginación
  async findAll(
    paginationDto: PaginationDto,
    title_like?: string,
  ): Promise<{
    items: NotificationTemplate[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<NotificationTemplate> = {};

    if (title_like) {
      filterQuery.title = { $regex: new RegExp(title_like, 'i') };
    }

    const totalItems = await this.notificationTemplateModel
      .countDocuments(filterQuery)
      .exec();
    const items = await this.notificationTemplateModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar una plantilla por ID
  async findOne(id: string): Promise<NotificationTemplate | null> {
    return this.notificationTemplateModel.findById(id).exec();
  }

  // Buscar plantillas con filtros dinámicos y paginación
async findWithFilters(
    filters: Partial<NotificationTemplate & { search?: string }>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: NotificationTemplate[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;
  
    const filterQuery: FilterQuery<NotificationTemplate> = {};
  
    // Si hay un término de búsqueda general
    if (filters.search) {
      const searchTerm = filters.search as string;
      filterQuery.$or = [
        { title: { $regex: new RegExp(searchTerm, 'i') } },
        { body: { $regex: new RegExp(searchTerm, 'i') } },
      ];
    }
  
    // Aplicar filtros dinámicos específicos
    const filterableFields = Object.keys(filters).filter(
      (key) => key !== 'page' && key !== 'limit' && key !== 'search',
    );
  
    filterableFields.forEach((key) => {
      if (filters[key]) {
        if (key === 'organizationId') {
          filterQuery[key] = new Types.ObjectId(filters[key]);
        } else if (typeof filters[key] === 'string') {
          filterQuery[key] = { $regex: new RegExp(filters[key], 'i') };
        } else {
          filterQuery[key] = filters[key];
        }
      }
    });
  
    // Obtener el total de elementos que cumplen con los filtros
    const totalItems = await this.notificationTemplateModel
      .countDocuments(filterQuery)
      .exec();
  
    // Obtener los elementos con paginación
    const items = await this.notificationTemplateModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();
  
    const totalPages = Math.ceil(totalItems / limit);
  
    return { items, totalItems, totalPages, currentPage: page };
  }
  

  // Eliminar una plantilla por ID
  async remove(id: string): Promise<NotificationTemplate | null> {
    return this.notificationTemplateModel.findByIdAndDelete(id).exec();
  }

  // Incrementar el total de envíos de una plantilla
  async incrementTotalSent(id: string): Promise<NotificationTemplate | null> {
    const template = await this.notificationTemplateModel.findById(id).exec();
    if (!template) {
      throw new BadRequestException('Notification template not found');
    }

    template.totalSent += 1;
    return template.save();
  }
}
