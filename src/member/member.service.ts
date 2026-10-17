import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from './interfaces/member.interface';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { findWithFilters } from 'src/common/common.service';
import { User } from 'src/user/interfaces/user.interface';

// Documentos de relleno que no sirven como contraseña (ver dedupe de members)
const PLACEHOLDER_ID_NUMBERS = ['ACHOAPP', 'APPACHO', 'N/A', '#N/A'];

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

  // Restablecer la contraseña de Firebase al número de documento del miembro
  async resetPasswordToIdNumber(
    id: string,
  ): Promise<{ email: string; idNumber: string }> {
    const member = await this.memberModel.findById(id).exec();
    if (!member) {
      throw new NotFoundException('No se encontró el miembro');
    }

    const idNumber = String(member.properties?.idNumber ?? '').trim();
    if (
      idNumber.length < 6 ||
      PLACEHOLDER_ID_NUMBERS.includes(idNumber.toUpperCase())
    ) {
      throw new BadRequestException(
        `El miembro no tiene un número de documento válido para usar como contraseña ("${idNumber}"). Corrige el documento primero (mínimo 6 caracteres).`,
      );
    }

    // La cuenta se busca por el user vinculado y, de respaldo, por el correo
    let firebaseUser: admin.auth.UserRecord | null = null;
    const user = member.userId
      ? await this.userModel.findById(member.userId).exec().catch(() => null)
      : null;
    if (user?.firebaseUid) {
      firebaseUser = await admin
        .auth()
        .getUser(user.firebaseUid)
        .catch(() => null);
    }
    const email = String(member.properties?.email ?? '').trim();
    if (!firebaseUser && email) {
      firebaseUser = await admin
        .auth()
        .getUserByEmail(email)
        .catch(() => null);
    }
    if (!firebaseUser) {
      throw new NotFoundException(
        'El miembro no tiene una cuenta de acceso en Firebase',
      );
    }

    await admin.auth().updateUser(firebaseUser.uid, { password: idNumber });
    // Cierra las sesiones abiertas con la contraseña anterior
    await admin.auth().revokeRefreshTokens(firebaseUser.uid);

    if (member.properties?.password !== undefined) {
      await this.memberModel
        .updateOne({ _id: member._id }, { 'properties.password': idNumber })
        .exec();
    }

    return { email: firebaseUser.email, idNumber };
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