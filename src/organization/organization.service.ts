import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Organization } from './interfaces/organization.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel('Organization') private organizationModel: Model<Organization>,
  ) {}

  // Crear una nueva organización
  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    const newOrganization = new this.organizationModel(createOrganizationDto);
    return newOrganization.save();
  }

  // Actualizar organización por ID
  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.organizationModel
      .findByIdAndUpdate(id, updateOrganizationDto, { new: true })
      .exec();
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organization;
  }

  // Obtener todas las organizaciones con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: Organization[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.organizationModel.countDocuments().exec();
    const items = await this.organizationModel
      .find()
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar organizaciones con filtros
  async findWithFilters(
    filters: Partial<Organization>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Organization[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<Organization> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (key === 'name') {
          filterQuery[key] = { $regex: value, $options: 'i' };
        }
      }
    });

    const totalItems = await this.organizationModel
      .countDocuments(filterQuery)
      .exec();
    const items = await this.organizationModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener una organización por ID
  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationModel.findById(id).exec();
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organization;
  }

  // Eliminar una organización por ID
  async remove(id: string): Promise<Organization> {
    const organization = await this.organizationModel
      .findByIdAndDelete(id)
      .exec();
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organization;
  }
}
