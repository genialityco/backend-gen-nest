import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventInterface } from './interfaces/event.interface';
import { Model } from 'mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { findWithFilters } from 'src/common/common.service';

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
    const { page = 1, limit = 100 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.EventModel.countDocuments().exec();
    const items = await this.EventModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar eventos con filtros y paginación
  async findWithFilters(
   
    paginationDto: PaginationDto,
    
  ): Promise<{
    items: any[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    return findWithFilters<EventInterface>(
    this.EventModel,
    paginationDto,
    paginationDto.filters
  );
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
