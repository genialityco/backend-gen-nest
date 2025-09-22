import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from './interfaces/member.interface';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { findWithFilters } from 'src/common/common.service';
import { User } from 'src/user/interfaces/user.interface';

@Injectable()
export class MemberService {
  constructor(@InjectModel('Member') private memberModel: Model<Member>, @InjectModel('User') private userModel: Model<User>) {}

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
    paginationDto: PaginationDto,
  ): Promise<{
    items: Member[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    return findWithFilters<Member>(
               this.memberModel,
               paginationDto,
               paginationDto.filters,
             );
  }

  

  // Obtener un miembro por ID
  async findOne(id: string): Promise<Member | null> {
    return this.memberModel.findById(id).exec();
  }

  // Eliminar un miembro por ID
  async remove(id: string): Promise<Member | null> {
    return this.memberModel.findByIdAndDelete(id).exec();
  }
  async findMembersByEmail(paginationDto: PaginationDto): Promise<{
    items: any[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
 console.log('📧 Búsqueda de members por email:', JSON.stringify(paginationDto, null, 2));

  const page = Number(paginationDto.current || 1);
  const limit = 5; // Límite fijo en 5
  const skip = (page - 1) * limit;

  const filterQuery = {};

  // Procesar filtros - solo contains
  if (paginationDto.filters && Array.isArray(paginationDto.filters)) {
    paginationDto.filters.forEach((filter) => {
      const { field, value } = filter;
      
      if (value) {
        console.log(`🔍 Aplicando filtro contains: ${field} = "${value}"`);
        
        // Crear regex para búsqueda que contenga el valor
        const regex = new RegExp(value, 'i');
        filterQuery[field] = { $regex: regex };
      }
    });
  }

  console.log('🔎 FilterQuery:', JSON.stringify(filterQuery, null, 2));

  // Ejecutar consulta SIN populate porque userId es string
  const totalItems = await this.memberModel.countDocuments(filterQuery);
  const items = await this.memberModel
    .find(filterQuery)
    .skip(skip)
    .limit(limit)
    .exec();

  const userIds = items.map(member => member.userId).filter(Boolean);
  const users = await this.userModel.find({ _id: { $in: userIds } });

// Mapear usuarios a members
  const itemsWithUsers = items.map(member => ({
  ...member.toObject(),
  user: users.find(user => user._id.toString() === member.userId.toString())
}));

  const totalPages = Math.ceil(totalItems / limit);

  console.log(`📊 Resultado: ${itemsWithUsers.length} items de ${totalItems} total (página ${page}/${totalPages})`);

  return {
    items: itemsWithUsers,
    totalItems,
    totalPages,
    currentPage: page,
}
  }}