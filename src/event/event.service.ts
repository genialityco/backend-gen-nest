import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventInterface } from './interfaces/event.interface';
import { FilterQuery, Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectModel('Event') private EventModel: Model<EventInterface>,
  ) {}

  // Crear un nuevo evento
  async create(eventDto: CreateEventDto): Promise<EventInterface> {
    const newEvent = new this.EventModel(eventDto);
    return newEvent.save();
  }

  // Actualizar un evento por ID
  async update(
    id: string,
    eventDto: UpdateEventDto,
  ): Promise<EventInterface | null> {
    return this.EventModel.findByIdAndUpdate(id, eventDto, {
      new: true,
    }).exec();
  }

  // Obtener todos los eventos con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: EventInterface[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.EventModel.countDocuments().exec();
    const items = await this.EventModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar eventos con filtros y paginación
  async findWithFilters(
    filters: Partial<EventInterface>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: EventInterface[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<EventInterface> = {};

    // Filtrar solo los campos que no sean 'page' o 'limit'
    const filterableFields = Object.keys(filters).filter(
      (key) => key !== 'page' && key !== 'limit',
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
    
    // Aplicar la paginación después de construir el query
    const totalItems = await this.EventModel.countDocuments(filterQuery).exec();
    const items = await this.EventModel.find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener un evento por ID
  async findOne(id: string): Promise<EventInterface | null> {
    return this.EventModel.findById(id).exec();
  }

  // Eliminar un evento por ID
  async remove(id: string): Promise<EventInterface | null> {
    return this.EventModel.findByIdAndDelete(id).exec();
  }
}
