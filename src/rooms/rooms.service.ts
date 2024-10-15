import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Room } from './interfaces/room.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel('Room') private RoomModel: Model<Room>) {}

  // Crear una nueva sala
  async create(createRoomDto: any): Promise<Room> {
    const newRoom = new this.RoomModel(createRoomDto);
    return newRoom.save();
  }

  // Actualizar una sala por ID
  async update(id: string, updateRoomDto: any): Promise<Room> {
    const room = await this.RoomModel.findByIdAndUpdate(id, updateRoomDto, {
      new: true,
    }).exec();
    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }
    return room;
  }

  // Obtener todas las salas con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: Room[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.RoomModel.countDocuments().exec();
    const items = await this.RoomModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar salas con filtros y paginación
  async findWithFilters(
    filters: Partial<Room>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Room[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<Room> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (key === 'eventId' || key.endsWith('Id')) {
          filterQuery[key] = new Types.ObjectId(value as string);
        }
        if (typeof value === 'string') {
          filterQuery[key] = { $regex: value, $options: 'i' };
        }
      }
    });

    const totalItems = await this.RoomModel.countDocuments(filterQuery).exec();
    const items = await this.RoomModel.find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener una sala por ID
  async findOne(id: string): Promise<Room> {
    const room = await this.RoomModel.findById(id).exec();
    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }
    return room;
  }

  // Eliminar una sala por ID
  async remove(id: string): Promise<Room> {
    const room = await this.RoomModel.findByIdAndDelete(id).exec();
    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }
    return room;
  }
}
