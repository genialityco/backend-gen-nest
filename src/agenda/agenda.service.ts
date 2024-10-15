import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Agenda } from './interfaces/agenda.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';

@Injectable()
export class AgendaService {
  constructor(@InjectModel('Agenda') private agendaModel: Model<Agenda>) {}

  // Crear una nueva agenda
  async create(createAgendaDto: CreateAgendaDto): Promise<Agenda> {
    const newAgenda = new this.agendaModel(createAgendaDto);
    return newAgenda.save();
  }

  // Actualizar una agenda por ID
  async update(
    id: string,
    updateAgendaDto: UpdateAgendaDto,
  ): Promise<Agenda | null> {
    return this.agendaModel
      .findByIdAndUpdate(id, updateAgendaDto, { new: true })
      .exec();
  }

  // Obtener todas las agendas con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: Agenda[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.agendaModel.countDocuments().exec();
    const items = await this.agendaModel
      .find()
      .populate('eventId')
      .populate('sessions.speakers')
      .populate('sessions.module')
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener una agenda por ID
  async findOne(id: string): Promise<Agenda | null> {
    return this.agendaModel
      .findById(id)
      .populate('eventId')
      .populate('sessions.speakers')
      .populate('sessions.module')
      .exec();
  }

  // Buscar agendas con filtros y paginación
  async findWithFilters(
    filters: FilterQuery<Agenda>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Agenda[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<Agenda> = {};

    // Construimos la consulta en base a los filtros proporcionados
    const filterableFields = Object.keys(filters);
    filterableFields.forEach((key) => {
      const value = filters[key];

      if (value !== undefined && value !== null) {
        // Convertimos claves que son IDs
        if (key.endsWith('Id') || key === 'eventId') {
          filterQuery[key] = new Types.ObjectId(value as string);
        }
        // Búsqueda parcial para strings
        else if (typeof value === 'string') {
          filterQuery[key] = { $regex: new RegExp(value, 'i') };
        }
        // Si es un objeto, lo pasamos directamente (ej. rango de fechas)
        else if (typeof value === 'object') {
          filterQuery[key] = value;
        }
        // Para otros tipos de datos, asignamos el valor directamente
        else {
          filterQuery[key] = value;
        }
      }
    });

    const totalItems = await this.agendaModel
      .countDocuments(filterQuery)
      .exec();
    const items = await this.agendaModel
      .find(filterQuery)
      .populate('eventId')
      .populate('sessions.speakers')
      .populate('sessions.moduleId')
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);
    return { items, totalItems, totalPages, currentPage: page };
  }

  // Eliminar una agenda por ID
  async remove(id: string): Promise<Agenda | null> {
    return this.agendaModel.findByIdAndDelete(id).exec();
  }
}
