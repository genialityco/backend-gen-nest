import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Attendee } from './interfaces/attendee.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';

@Injectable()
export class AttendeeService {
  constructor(
    @InjectModel('Attendee') private attendeeModel: Model<Attendee>,
  ) {}

  // Crear un nuevo asistente
  async create(attendeeData: CreateAttendeeDto): Promise<Attendee> {
    const newAttendee = new this.attendeeModel(attendeeData);
    return newAttendee.save();
  }

  // Actualizar un asistente por ID
  async update(
    id: string,
    attendeeDto: UpdateAttendeeDto,
  ): Promise<Attendee | null> {
    return this.attendeeModel
      .findByIdAndUpdate(id, attendeeDto, { new: true })
      .exec();
  }

  // Obtener todos los asistentes con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: Attendee[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.attendeeModel.countDocuments().exec();
    const items = await this.attendeeModel
      .find()
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar asistentes con filtros y paginación
  async findWithFilters(
    filters: Partial<Attendee>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Attendee[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<Attendee> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (key === 'eventId' || key === 'userId' || key.endsWith('Id')) {
          filterQuery[key] = new Types.ObjectId(value as string);
        } else {
          filterQuery[key] = value;
        }
      }
    });

    const totalItems = await this.attendeeModel
      .countDocuments(filterQuery)
      .exec();
    const items = await this.attendeeModel
      .find(filterQuery)
      .populate('eventId')
      .populate('userId')
      .populate('memberId')
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener un asistente por ID
  async findOne(id: string): Promise<Attendee | null> {
    return this.attendeeModel
      .findById(id)
      .populate('eventId')
      .populate('memberId')
      .exec();
  }

  // Eliminar un asistente por ID
  async remove(id: string): Promise<Attendee | null> {
    return this.attendeeModel.findByIdAndDelete(id).exec();
  }
}
