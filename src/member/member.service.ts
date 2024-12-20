import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Member } from './interfaces/member.interface';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class MemberService {
  constructor(@InjectModel('Member') private memberModel: Model<Member>) {}

  // Crear un nuevo miembro
  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const newMember = new this.memberModel(createMemberDto);
    return newMember.save();
  }

  // Actualizar un miembro por ID
  async update(
    id: string,
    updateMemberDto: UpdateMemberDto,
  ): Promise<Member | null> {
    return this.memberModel
      .findByIdAndUpdate(id, updateMemberDto, { new: true })
      .exec();
  }

  // Obtener todos los miembros con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: Member[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 1000 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.memberModel.countDocuments().exec();
    const items = await this.memberModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar miembros con filtros y paginación
  async findWithFilters(
    filters: Partial<Member>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Member[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;
  
    const filterQuery: FilterQuery<Member> = {};
  
    // Excluir los campos de paginación de los filtros
    const validFilters = Object.keys(filters).filter(
      (key) => key !== 'page' && key !== 'limit'
    );
  
    validFilters.forEach((key) => {
      const value = filters[key as keyof Member];
      if (value !== undefined && value !== null) {
        if (
          key === 'organizationId' ||
          key === 'userId' ||
          key.endsWith('Id')
        ) {
          filterQuery[key] = new Types.ObjectId(value as string);
        } else if (typeof value === 'string') {
          filterQuery[key] = { $regex: value, $options: 'i' };
        } else {
          filterQuery[key] = value;
        }
      }
    });
  
    const totalItems = await this.memberModel.countDocuments(filterQuery).exec();
    const items = await this.memberModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);
  
    return { items, totalItems, totalPages, currentPage: page };
  }
  

  // Obtener un miembro por ID
  async findOne(id: string): Promise<Member | null> {
    return this.memberModel.findById(id).exec();
  }

  // Eliminar un miembro por ID
  async remove(id: string): Promise<Member | null> {
    return this.memberModel.findByIdAndDelete(id).exec();
  }
}
