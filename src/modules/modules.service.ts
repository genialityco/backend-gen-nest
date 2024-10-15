import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Module } from './interfaces/module.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModulesService {
  constructor(@InjectModel('Module') private moduleModel: Model<Module>) {}

  // Crear un nuevo módulo
  async create(createModuleDto: CreateModuleDto): Promise<Module> {
    const newModule = new this.moduleModel(createModuleDto);
    return newModule.save();
  }

  // Actualizar un módulo por ID
  async update(
    id: string,
    updateModuleDto: UpdateModuleDto,
  ): Promise<Module | null> {
    return this.moduleModel
      .findByIdAndUpdate(id, updateModuleDto, { new: true })
      .exec();
  }

  // Obtener todos los módulos con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: Module[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.moduleModel.countDocuments().exec();
    const items = await this.moduleModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar módulos con filtros y paginación
  async findWithFilters(
    filters: Partial<Module>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Module[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<Module> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (key === 'eventId' || key.endsWith('Id')) {
          filterQuery[key] = new Types.ObjectId(value as string);
        } else if (typeof value === 'string') {
          filterQuery[key] = { $regex: value, $options: 'i' };
        } else if (key === 'startTime' || key === 'endTime') {
          const dateRange = value as { start: string; end: string };
          if (dateRange.start && dateRange.end) {
            filterQuery[key] = {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end),
            };
          }
        } else {
          filterQuery[key] = value;
        }
      }
    });

    const totalItems = await this.moduleModel
      .countDocuments(filterQuery)
      .exec();
    const items = await this.moduleModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener un módulo por ID
  async findOne(id: string): Promise<Module | null> {
    return this.moduleModel.findById(id).exec();
  }

  // Eliminar un módulo por ID
  async remove(id: string): Promise<Module | null> {
    return this.moduleModel.findByIdAndDelete(id).exec();
  }
}
