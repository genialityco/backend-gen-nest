/* eslint-disable prefer-const */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { User } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Member } from 'src/member/interfaces/member.interface';
import * as admin from 'firebase-admin';
import { Attendee } from 'src/attendee/interfaces/attendee.interface';
import { UserFirebase } from './schemas/user.schema';
import { EmailValidator } from './utils/email.validator';

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private userModel: Model<User>, @InjectModel('Member') private memberModel: Model<Member>, @InjectModel('Attendee') private attendeeModel: Model<Attendee>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = new this.userModel(createUserDto);
    return newUser.save();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, {
        new: true,
      })
      .exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findAll(paginationDto: PaginationDto): Promise<{
    items: User[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.userModel.countDocuments().exec();
    const items = await this.userModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  async findWithFilters(
    filters: Partial<User>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: User[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<User> = {};

    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        if (key === 'firebaseUid') {
          filterQuery[key] = { $regex: filters[key], $options: 'i' };
        }
      }
    });

    const totalItems = await this.userModel.countDocuments(filterQuery).exec();
    const items = await this.userModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async remove(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async updatePushToken(userId: string, expoPushToken: string): Promise<User> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.expoPushToken = expoPushToken;
    return user.save();
  }
async addOrCreateAttendee(payload: {
  user: UserFirebase;
  attendee: Attendee;
  member: Member;
}) {
  const { user, attendee, member } = payload;

  // 🔹 VALIDAR Y LIMPIAR EMAIL
  const emailValidation = EmailValidator.cleanAndValidateEmail(user.email);
  if (!emailValidation.success) {
    throw new BadRequestException(
      `Email inválido: "${user.email}" - Razón: ${emailValidation.error}`
    );
  }

  // Usar el email limpio
  const cleanEmail = emailValidation.email!;

  // 🔹 1. Buscar member existente por email
  let existingMember = await this.memberModel.findOne({ 
    'properties.email': cleanEmail,
    organizationId: member.organizationId 
  }).populate('userId');

  let firebaseUser;
  let mongoUser;
  let mongoMember;

  if (existingMember && existingMember.userId) {
    // ✅ CASO 1: Usuario existe en miembros Y tiene userId
    // Validar que hay cuenta en Firebase
    try {
      firebaseUser = await admin.auth().getUserByEmail(cleanEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new Error(`Usuario ${cleanEmail} existe en miembros pero no tiene cuenta en Firebase`);
      }
      throw error;
    }

    // Usar el usuario existente - buscar el usuario completo por ID
    mongoUser = await this.userModel.findById(existingMember.userId);
    if (!mongoUser) {
      throw new Error(`Usuario referenciado en member no encontrado`);
    }
    
    // Actualizar member haciendo merge de data
    mongoMember = existingMember;
    mongoMember.memberActive = member.memberActive ?? mongoMember.memberActive;
    mongoMember.properties = { ...mongoMember.properties, ...member.properties };
    await mongoMember.save();

    console.log('Member actualizado con merge de datos');
    console.log(`mongoUser._id en CASO 1:`, mongoUser._id);

  } else {
    try {
      firebaseUser = await admin.auth().getUserByEmail(cleanEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        firebaseUser = await admin.auth().createUser({
          email: cleanEmail,
          password: user.password ?? Math.random().toString(36).slice(-8),
        });
        console.log('Usuario creado en Firebase');
      } else {
        throw error;
      }
    }

    // 2b. MongoDB: crear User
    mongoUser = await this.userModel.findOne({ firebaseUid: firebaseUser.uid });
    if (!mongoUser) {
      mongoUser = await this.userModel.create({
        firebaseUid: firebaseUser.uid,
        email: cleanEmail, // Asegurar que el email esté en el user
      });
      console.log('Usuario creado en MongoDB');
    }

    // 2c. MongoDB: crear Member
    mongoMember = await this.memberModel.create({
      userId: mongoUser._id,
      organizationId: member.organizationId,
      memberActive: member.memberActive ?? true,
      properties: {
        email: cleanEmail, // Asegurar que el email esté en properties para futuras búsquedas
        ...member.properties
      },
    });
    console.log('Member creado');
  }

  // 🔹 3. MongoDB: crear Attendee inmediatamente en ambos casos
  let mongoAttendee = await this.attendeeModel.findOne({
    eventId: attendee.eventId,
    memberId: mongoMember._id
  });

  console.log(`Buscando attendee con eventId: ${attendee.eventId}, memberId: ${mongoMember._id}`);
  console.log(`Attendee encontrado:`, mongoAttendee);
  console.log(`mongoUser._id:`, mongoUser._id);
  console.log(`mongoMember._id:`, mongoMember._id);

  if (!mongoAttendee) {
    console.log('Creando nuevo attendee...');
    mongoAttendee = await this.attendeeModel.create({
      eventId: attendee.eventId,
      userId: mongoUser._id,
      memberId: mongoMember._id,
      attended: attendee.attended ?? true,
      certificationHours: attendee.certificationHours,
      typeAttendee: attendee.typeAttendee,
      certificateDownloads: attendee.certificateDownloads ?? 0,
    });
    console.log('Attendee creado con userId:', mongoAttendee.userId);
  } else {
    console.log('Attendee ya existe, actualizando...');
    // Si ya existe, actualizar
    mongoAttendee.attended = attendee.attended ?? mongoAttendee.attended ?? true;
    mongoAttendee.userId = mongoAttendee.userId || mongoUser._id;
    mongoAttendee.certificationHours = attendee.certificationHours ?? mongoAttendee.certificationHours;
    mongoAttendee.typeAttendee = attendee.typeAttendee ?? mongoAttendee.typeAttendee;
    mongoAttendee.certificateDownloads = attendee.certificateDownloads ?? mongoAttendee.certificateDownloads;
    await mongoAttendee.save();
    console.log('Attendee actualizado con userId:', mongoAttendee.userId);
  }

  // 🔹 Resultado final
  return {
    firebaseUser,
    user: mongoUser,
    member: mongoMember,
    attendee: mongoAttendee,
  };
}
}