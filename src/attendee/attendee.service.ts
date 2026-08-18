import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Attendee } from './interfaces/attendee.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';
import { findWithFilters } from 'src/common/common.service';

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

    // Obtén las claves de los campos filtrables excluyendo "page" y "limit"
    const filterableFields = Object.keys(filters).filter(
      (key) => key !== 'page' && key !== 'limit',
    );

    // Itera directamente sobre filterableFields
    filterableFields.forEach((key) => {
      const value = filters[key as keyof Attendee]; // Accede al valor correspondiente
      if (value !== undefined && value !== null) {
        // Si es un ID, crea un ObjectId
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
      .populate('eventId') // Cargar relaciones
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

  async findWithFilters1(
      paginationDto: PaginationDto,
    ): Promise<{
      items: Attendee[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }> {
      return findWithFilters<Attendee>(
                 this.attendeeModel,
                 paginationDto,
                 paginationDto.filters,
                 [ 'memberId', "eventId"]
               );
    }
  

  // Estadísticas de certificados agrupadas por evento
  async getCertificateStatsByEvent(organizationId?: string): Promise<
    Array<{
      eventId: Types.ObjectId;
      eventName: string;
      startDate: Date;
      attendeesCount: number;
      certifiedHoursCount: number;
      downloadersCount: number;
      totalDownloads: number;
    }>
  > {
    const pipeline: any[] = [
      {
        $group: {
          _id: '$eventId',
          // Usuarios que asistieron al evento = total de registros con ese eventId
          attendeesCount: { $sum: 1 },
          // Usuarios con horas certificadas = certificationHours > 0
          // (se guarda como string, ej. '15' -> se convierte a número)
          certifiedHoursCount: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $convert: {
                        input: '$certificationHours',
                        to: 'double',
                        onError: 0,
                        onNull: 0,
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
          // Asistentes con attended=true (solo para filtrar eventos con certificados)
          attendedCount: {
            $sum: { $cond: [{ $eq: ['$attended', true] }, 1, 0] },
          },
          // Personas que descargaron al menos una vez
          downloadersCount: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ['$certificateDownloads', 0] }, 0] }, 1, 0],
            },
          },
          // Descargas totales
          totalDownloads: {
            $sum: { $ifNull: ['$certificateDownloads', 0] },
          },
        },
      },
      // Solo eventos con certificados (asistentes con derecho o alguna descarga)
      {
        $match: {
          $or: [{ attendedCount: { $gt: 0 } }, { totalDownloads: { $gt: 0 } }],
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
    ];

    if (organizationId) {
      pipeline.push({
        $match: { 'event.organizationId': new Types.ObjectId(organizationId) },
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 0,
          eventId: '$_id',
          eventName: '$event.name',
          startDate: '$event.startDate',
          attendeesCount: 1,
          certifiedHoursCount: 1,
          downloadersCount: 1,
          totalDownloads: 1,
        },
      },
      { $sort: { totalDownloads: -1 } },
    );

    return this.attendeeModel.aggregate(pipeline).exec();
  }

  // Detalle de usuarios de un evento (nombre, correo, horas, descargas)
  async getEventAttendees(eventId: string): Promise<
    Array<{
      fullName: string;
      email: string;
      idNumber: string;
      certificationHours: string;
      certificateDownloads: number;
    }>
  > {
    return this.attendeeModel
      .aggregate([
        { $match: { eventId: new Types.ObjectId(eventId) } },
        {
          $lookup: {
            from: 'members',
            localField: 'memberId',
            foreignField: '_id',
            as: 'memberDoc',
          },
        },
        { $unwind: { path: '$memberDoc', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            fullName: {
              $ifNull: [
                '$member.properties.fullName',
                '$memberDoc.properties.fullName',
              ],
            },
            email: {
              $ifNull: [
                '$member.properties.email',
                '$memberDoc.properties.email',
              ],
            },
            idNumber: {
              $ifNull: [
                '$member.properties.idNumber',
                '$memberDoc.properties.idNumber',
              ],
            },
            certificationHours: { $ifNull: ['$certificationHours', '0'] },
            certificateDownloads: { $ifNull: ['$certificateDownloads', 0] },
          },
        },
        // Primero los que más descargas tienen; luego alfabético
        { $sort: { certificateDownloads: -1, fullName: 1 } },
      ])
      .exec();
  }

  // Incrementar descargas del certificado por usuario
  // attendee.service.ts

  async incrementCertificateDownloads({
    attendeeId,
   
  }: {
    attendeeId?: string;
   
  }): Promise<Attendee | null> {
    
    return this.attendeeModel
      .findOneAndUpdate(
        { _id: attendeeId },
        { $inc: { certificateDownloads: 1 } },
        { new: true },
      )
      .exec();
  }
}
