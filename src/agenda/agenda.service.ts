import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    const { page = 1, limit = 10 } = paginationDto as any;
    const skip = (page - 1) * limit;

    const totalItems = await this.agendaModel.countDocuments().exec();
    const items = await this.agendaModel
      .find()
      .populate('eventId')
      .populate('sessions.speakers')
      .populate('sessions.moduleId')
      .populate('sessions.subSessions.speakers') // ✅ FIX
      .populate('sessions.subSessions.moduleId') // ✅ FIX
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
      .populate('sessions.moduleId')
      .populate('sessions.subSessions.speakers') // ✅ FIX
      .populate('sessions.subSessions.moduleId') // ✅ FIX
      .exec();
  }

  /**
   * ✅ FIX PRINCIPAL:
   * Tu front llama: /agendas/search?eventId=xxxx
   * Pero a veces refine manda: filters[0][field]=eventId...
   *
   * Esta versión soporta ambos formatos y evita que el filtro quede vacío,
   * que es lo que hacía que "todas las agendas" parecieran la misma (porque devolvía la primera por sort).
   */
  async findWithFilters(paginationDto: PaginationDto): Promise<{
    items: Agenda[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const page = Number(
      (paginationDto as any).current || (paginationDto as any).page || 1,
    );
    const limit = Number(
      (paginationDto as any).pageSize || (paginationDto as any).limit || 10,
    );
    const skip = (page - 1) * limit;

    const mongoFilter: any = {};

    // 1) Query params directos: ?eventId=xxxx
    const knownKeys = new Set([
      '_start',
      '_end',
      '_sort',
      '_order',
      'page',
      'limit',
      'current',
      'pageSize',
      'sorters',
      'filters',
    ]);

    Object.keys(paginationDto as any).forEach((key) => {
      if (knownKeys.has(key)) return;

      const value = (paginationDto as any)[key];
      if (value === undefined || value === null || value === '') return;

      mongoFilter[key] = value;
    });

    // 2) Refine filters: filters=[{field,operator,value}]
    const filters = (((paginationDto as any).filters || []) as any[]) || [];
    for (const f of filters) {
      const field = f?.field;
      const operator = String(f?.operator || 'eq');
      const value = f?.value;

      if (!field) continue;
      if (value === undefined || value === null || value === '') continue;

      if (operator === 'eq') {
        mongoFilter[field] = value;
      } else if (operator === 'contains') {
        mongoFilter[field] = { $regex: String(value), $options: 'i' };
      }
    }

    // Sort
    const sortOptions: any = {};
    const sorters = (paginationDto as any).sorters;

    if (Array.isArray(sorters) && sorters.length > 0) {
      for (const s of sorters) {
        if (!s?.field) continue;
        sortOptions[s.field] =
          String(s.order || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      }
    } else {
      sortOptions.createdAt = -1;
    }

    // Debug para validar que SI está filtrando por eventId
    console.log(
      '🔎 mongoFilter agendas/search =>',
      JSON.stringify(mongoFilter, null, 2),
    );

    const totalItems = await this.agendaModel
      .countDocuments(mongoFilter)
      .exec();

    const items = await this.agendaModel
      .find(mongoFilter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('eventId')
      .populate('sessions.speakers')
      .populate('sessions.moduleId')
      .populate('sessions.subSessions.speakers') // ✅ subSessions speakers como objeto
      .populate('sessions.subSessions.moduleId') // ✅ subSessions module como objeto
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
    };
  }

  // Eliminar una agenda por ID
  async remove(id: string): Promise<Agenda | null> {
    return this.agendaModel.findByIdAndDelete(id).exec();
  }

  async adjustTimes(id: string, minutes: number): Promise<Agenda | null> {
    const agenda = await this.agendaModel.findById(id);
    if (!agenda) return null;

    // Ajustar el tiempo de inicio y fin de cada sesión
    agenda.sessions.forEach((session: any) => {
      session.startDateTime = new Date(
        session.startDateTime.getTime() + minutes * 60000,
      );
      session.endDateTime = new Date(
        session.endDateTime.getTime() + minutes * 60000,
      );
    });

    return agenda.save();
  }
}
