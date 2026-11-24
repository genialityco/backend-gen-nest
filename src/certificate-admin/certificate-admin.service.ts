import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as admin from 'firebase-admin';
import { Member } from 'src/member/interfaces/member.interface';
import { User } from 'src/user/interfaces/user.interface';
import { Attendee } from 'src/attendee/interfaces/attendee.interface';
import { Certificate } from 'src/certificate/interfaces/certificate.interface';
import { CertificateEmailService } from './certificate-email.service';
import {
  ATTENDEE_ROOT_KEYS,
  MEMBER_BASE_KEYS,
  PLACEHOLDER_ID_NUMBERS,
  accentInsensitivePattern,
  escapeRegex,
  isEmpty,
  isValidPasswordIdNumber,
  maskEmail,
  maskIdNumber,
  normalizeEmail,
  normalizeIdNumber,
} from './certificate-admin.utils';
import {
  AttendeeRowDto,
  UpdateAttendeeDataDto,
  UpdateMemberPropertiesDto,
} from './dto/certificate-admin.dto';

// Sin documento o con uno de relleno (ACHOAPP, N/A...)
const isMissingIdNumber = (value: unknown) => {
  const id = normalizeIdNumber(value);
  return !id || PLACEHOLDER_ID_NUMBERS.includes(id.toUpperCase());
};

// Comparación de texto sin mayúsculas ni tildes
const LOOSE_COLLATION = { locale: 'es', strength: 1 };

export type RowResult = {
  row: number;
  status: 'created' | 'skipped' | 'error';
  memberStatus?: 'existing' | 'created';
  attendeeId?: string;
  memberId?: string;
  fullName?: string;
  message?: string;
  warnings: string[];
};

type MemberIndex = {
  byId: Map<string, Member>;
  byEmail: Map<string, Member>;
};

@Injectable()
export class CertificateAdminService {
  constructor(
    @InjectModel('Member') private memberModel: Model<Member>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Attendee') private attendeeModel: Model<Attendee>,
    @InjectModel('Certificate') private certificateModel: Model<Certificate>,
    @InjectModel('Event') private eventModel: Model<any>,
    private readonly emailService: CertificateEmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Organización / eventos
  // ---------------------------------------------------------------------------

  async getOrganizationEvents(organizationId: string) {
    const orgId = this.toObjectId(organizationId, 'organizationId');
    return this.eventModel
      .aggregate([
        { $match: { organizationId: orgId } },
        {
          $lookup: {
            from: 'certificates',
            localField: '_id',
            foreignField: 'eventId',
            as: 'certificates',
            pipeline: [{ $project: { _id: 1, updatedAt: 1 } }],
          },
        },
        {
          $lookup: {
            from: 'attendees',
            localField: '_id',
            foreignField: 'eventId',
            as: 'attendeeStats',
            pipeline: [
              {
                $group: {
                  _id: null,
                  attendees: { $sum: 1 },
                  downloads: { $sum: { $ifNull: ['$certificateDownloads', 0] } },
                  downloaders: {
                    $sum: {
                      $cond: [
                        { $gt: [{ $ifNull: ['$certificateDownloads', 0] }, 0] },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
        {
          $project: {
            name: 1,
            startDate: 1,
            endDate: 1,
            styles: 1,
            certificateId: { $first: '$certificates._id' },
            certificateUpdatedAt: { $first: '$certificates.updatedAt' },
            attendees: {
              $ifNull: [{ $first: '$attendeeStats.attendees' }, 0],
            },
            downloads: { $ifNull: [{ $first: '$attendeeStats.downloads' }, 0] },
            downloaders: {
              $ifNull: [{ $first: '$attendeeStats.downloaders' }, 0],
            },
          },
        },
        { $sort: { startDate: -1 } },
      ])
      .exec();
  }

  async getEventOverview(eventId: string) {
    const event = await this.eventModel.findById(this.toObjectId(eventId, 'eventId')).lean<any>().exec();
    if (!event) throw new NotFoundException('No se encontró el evento');
    const certificate = await this.findEventCertificate(event._id);
    const attendees = await this.attendeeModel.countDocuments({ eventId: event._id }).exec();
    return { event, certificate, attendees };
  }

  // ---------------------------------------------------------------------------
  // Asistentes de un evento
  // ---------------------------------------------------------------------------

  async listEventAttendees(
    eventId: string,
    { q, page = 1, limit = 20 }: { q?: string; page?: number; limit?: number },
  ) {
    const evId = this.toObjectId(eventId, 'eventId');
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 200);

    const pipeline: any[] = [
      { $match: { eventId: evId } },
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'member',
        },
      },
      { $unwind: { path: '$member', preserveNullAndEmptyArrays: true } },
    ];

    const search = String(q ?? '').trim();
    if (search) {
      const pattern = accentInsensitivePattern(search);
      const idPattern = escapeRegex(normalizeIdNumber(search) || search);
      pipeline.push({
        $match: {
          $or: [
            { 'member.properties.fullName': { $regex: pattern, $options: 'i' } },
            { 'member.properties.email': { $regex: escapeRegex(search), $options: 'i' } },
            { 'member.properties.idNumber': { $regex: idPattern, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { 'member.properties.fullName': 1 } },
      {
        $facet: {
          items: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
            { $project: { 'member.properties.password': 0 } },
          ],
          total: [{ $count: 'count' }],
        },
      },
    );

    const [result] = await this.attendeeModel.aggregate(pipeline).exec();
    const totalItems = result?.total?.[0]?.count ?? 0;
    return {
      items: result?.items ?? [],
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum),
      currentPage: pageNum,
    };
  }

  // Carga masiva: por cada fila asegura user (Firebase + Mongo), member y attendee
  async bulkUpsertAttendees(eventId: string, rows: AttendeeRowDto[]) {
    const event = await this.eventModel.findById(this.toObjectId(eventId, 'eventId')).lean<any>().exec();
    if (!event) throw new NotFoundException('No se encontró el evento');
    const organizationId = event.organizationId as Types.ObjectId;

    const index = await this.buildMemberIndex(organizationId, rows);
    const results: RowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = row.row ?? i + 1;
      try {
        results.push(
          await this.processRow(event._id, organizationId, row, rowNumber, index),
        );
      } catch (error: any) {
        results.push({
          row: rowNumber,
          status: 'error',
          fullName: row.fullName,
          message: error?.message || 'Error desconocido',
          warnings: [],
        });
      }
    }

    // Correo con el enlace de descarga a los recién inscritos (en segundo plano,
    // solo si el certificado tiene diseño y el envío automático está activo)
    this.emailService.queueAutoSend(
      event._id,
      results.filter((r) => r.status === 'created' && r.attendeeId).map((r) => r.attendeeId),
    );

    return {
      results,
      summary: {
        created: results.filter((r) => r.status === 'created').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        errors: results.filter((r) => r.status === 'error').length,
        newMembers: results.filter((r) => r.memberStatus === 'created').length,
      },
    };
  }

  private async processRow(
    eventId: Types.ObjectId,
    organizationId: Types.ObjectId,
    row: AttendeeRowDto,
    rowNumber: number,
    index: MemberIndex,
  ): Promise<RowResult> {
    const warnings: string[] = [];
    const email = normalizeEmail(row.email);
    const idNumber = normalizeIdNumber(row.idNumber);
    const fullName = String(row.fullName ?? '').trim();

    if (!email && !idNumber) {
      throw new BadRequestException('La fila no tiene correo ni número de identificación');
    }

    // 1. Buscar el miembro por documento o por correo (evita duplicados)
    const byId = idNumber ? index.byId.get(idNumber) : undefined;
    const byEmail = email ? index.byEmail.get(email) : undefined;
    let member = byId ?? byEmail;
    let memberStatus: RowResult['memberStatus'] = 'existing';

    if (byId && byEmail && String(byId._id) !== String(byEmail._id)) {
      warnings.push(
        `El documento y el correo pertenecen a miembros distintos; se usó el miembro del documento (${byId.properties?.email || 'sin correo'})`,
      );
    }

    if (member) {
      const props = member.properties || {};
      if (email && props.email && normalizeEmail(props.email) !== email) {
        warnings.push(`Se mantuvo el correo registrado (${props.email})`);
      }
      if (idNumber && props.idNumber && normalizeIdNumber(props.idNumber) !== idNumber) {
        warnings.push(`Se mantuvo el documento registrado (${props.idNumber})`);
      }
      // Completar datos vacíos del miembro sin pisar lo que ya tenía
      const incoming: Record<string, string> = {
        fullName,
        idNumber,
        email,
        phone: String(row.phone ?? '').trim(),
      };
      const patch: Record<string, string> = {};
      for (const key of MEMBER_BASE_KEYS) {
        if (isEmpty(props[key]) && !isEmpty(incoming[key])) {
          patch[`properties.${key}`] = incoming[key];
        }
      }
      if (Object.keys(patch).length) {
        await this.memberModel.updateOne({ _id: member._id }, { $set: patch }).exec();
        for (const [path, value] of Object.entries(patch)) {
          member.properties = { ...member.properties, [path.replace('properties.', '')]: value };
        }
      }
    }

    // 2. Asegurar que exista el user (Firebase + Mongo) y quede ligado al miembro
    const loginEmail = normalizeEmail(member?.properties?.email) || email;
    const loginIdNumber = normalizeIdNumber(member?.properties?.idNumber) || idNumber;
    const user = await this.ensureUser(member, loginEmail, loginIdNumber);

    if (!member) {
      if (!fullName) {
        throw new BadRequestException('Para crear el miembro se necesita el nombre');
      }
      member = await this.memberModel.create({
        userId: String(user._id),
        organizationId,
        memberActive: true,
        properties: {
          fullName,
          idNumber,
          email,
          phone: String(row.phone ?? '').trim(),
        },
      });
      memberStatus = 'created';
    } else if (String(member.userId ?? '') !== String(user._id)) {
      await this.memberModel
        .updateOne({ _id: member._id }, { $set: { userId: String(user._id) } })
        .exec();
      member.userId = user._id as any;
      warnings.push('Se vinculó el miembro con su usuario');
    }

    // Que las siguientes filas del mismo lote encuentren este miembro
    if (idNumber) index.byId.set(idNumber, member);
    if (email) index.byEmail.set(email, member);

    // 3. Attendee: si ya está inscrito en el evento se omite
    const existing = await this.attendeeModel
      .findOne({ eventId, memberId: member._id })
      .exec();
    if (existing) {
      return {
        row: rowNumber,
        status: 'skipped',
        memberStatus,
        attendeeId: String(existing._id),
        memberId: String(member._id),
        fullName: member.properties?.fullName || fullName,
        message: 'Ya estaba inscrito en el evento',
        warnings,
      };
    }

    const { root, properties } = this.splitAttributes(row.attributes);
    const attendee = await this.attendeeModel.create({
      eventId,
      userId: user._id,
      memberId: member._id,
      attended: true,
      certificateDownloads: 0,
      ...root,
      ...(Object.keys(properties).length ? { properties } : {}),
    });

    return {
      row: rowNumber,
      status: 'created',
      memberStatus,
      attendeeId: String(attendee._id),
      memberId: String(member._id),
      fullName: member.properties?.fullName || fullName,
      warnings,
    };
  }

  // Precarga en una sola consulta los miembros de la organización que coinciden
  // con algún documento o correo del lote
  private async buildMemberIndex(
    organizationId: Types.ObjectId,
    rows: AttendeeRowDto[],
  ): Promise<MemberIndex> {
    const ids = new Set<string>();
    const emails = new Set<string>();
    for (const row of rows) {
      const raw = String(row.idNumber ?? '').trim();
      const id = normalizeIdNumber(raw);
      if (id) {
        ids.add(id);
        ids.add(raw);
      }
      const email = normalizeEmail(row.email);
      if (email) emails.add(email);
    }

    const index: MemberIndex = { byId: new Map(), byEmail: new Map() };
    if (!ids.size && !emails.size) return index;

    const idList = [...ids];
    const members = await this.memberModel
      .find({
        organizationId,
        $or: [
          { 'properties.idNumber': { $in: [...idList, ...idList.map(Number).filter((n) => !isNaN(n))] } },
          { 'properties.email': { $in: [...emails] } },
        ],
      })
      .collation(LOOSE_COLLATION)
      .sort({ createdAt: 1 })
      .exec();

    // Si hay duplicados se queda el más antiguo
    for (const member of members) {
      const id = normalizeIdNumber(member.properties?.idNumber);
      const email = normalizeEmail(member.properties?.email);
      if (id && !index.byId.has(id)) index.byId.set(id, member);
      if (email && !index.byEmail.has(email)) index.byEmail.set(email, member);
    }
    return index;
  }

  // Devuelve un user de Mongo válido, con cuenta en Firebase. Si no existe la
  // cuenta se crea con el correo y el documento como contraseña.
  private async ensureUser(
    member: Member | undefined,
    email: string,
    idNumber: string,
  ): Promise<User> {
    if (member?.userId && Types.ObjectId.isValid(String(member.userId))) {
      const user = await this.userModel.findById(String(member.userId)).exec();
      if (user?.firebaseUid) {
        const firebaseUser = await admin
          .auth()
          .getUser(user.firebaseUid)
          .catch(() => null);
        if (firebaseUser) return user;
      }
    }

    if (!email) {
      throw new BadRequestException('Se necesita un correo para crear el usuario');
    }

    let firebaseUser = await admin
      .auth()
      .getUserByEmail(email)
      .catch((error) => {
        if (error?.code === 'auth/user-not-found') return null;
        throw error;
      });

    if (!firebaseUser) {
      if (!isValidPasswordIdNumber(idNumber)) {
        throw new BadRequestException(
          `El documento "${idNumber}" no sirve como contraseña (mínimo 6 caracteres)`,
        );
      }
      firebaseUser = await admin.auth().createUser({ email, password: idNumber });
    }

    const existingUser = await this.userModel
      .findOne({ firebaseUid: firebaseUser.uid })
      .exec();
    if (existingUser) return existingUser;
    return this.userModel.create({ firebaseUid: firebaseUser.uid });
  }

  // typeAttendee y certificationHours van en la raíz; el resto en properties
  private splitAttributes(attributes: Record<string, any> = {}) {
    const root: Record<string, string> = {};
    const properties: Record<string, any> = {};
    for (const [key, value] of Object.entries(attributes || {})) {
      if (MEMBER_BASE_KEYS.includes(key)) continue;
      if (ATTENDEE_ROOT_KEYS.includes(key)) {
        root[key] = isEmpty(value) ? '' : String(value).trim();
      } else {
        properties[key] = typeof value === 'string' ? value.trim() : value;
      }
    }
    return { root, properties };
  }

  // ---------------------------------------------------------------------------
  // Miembros
  // ---------------------------------------------------------------------------

  // Miembros de la organización con su número de certificados (attendees).
  // sort: 'name' (por defecto) | 'certificates_desc' | 'certificates_asc'
  async searchOrganizationMembers(
    organizationId: string,
    {
      q,
      page = 1,
      limit = 20,
      sort = 'name',
    }: { q?: string; page?: number; limit?: number; sort?: string },
  ) {
    const orgId = this.toObjectId(organizationId, 'organizationId');
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const filter: Record<string, any> = { organizationId: orgId };

    const search = String(q ?? '').trim();
    if (search) {
      const idPattern = escapeRegex(normalizeIdNumber(search) || search);
      filter.$or = [
        { 'properties.fullName': { $regex: accentInsensitivePattern(search), $options: 'i' } },
        { 'properties.email': { $regex: escapeRegex(search), $options: 'i' } },
        { 'properties.idNumber': { $regex: idPattern, $options: 'i' } },
      ];
    }

    const countCertificates = [
      {
        $lookup: {
          from: 'attendees',
          localField: '_id',
          foreignField: 'memberId',
          as: 'certificateDocs',
          pipeline: [{ $project: { _id: 1 } }],
        },
      },
      { $addFields: { certificatesCount: { $size: '$certificateDocs' } } },
      { $project: { certificateDocs: 0, 'properties.password': 0 } },
    ];
    const paginate = [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }];
    const sortByCertificates = sort === 'certificates_desc' || sort === 'certificates_asc';

    // Ordenar por certificados exige contarlos para todos los miembros filtrados;
    // por nombre basta con contar los de la página
    const pipeline: any[] = sortByCertificates
      ? [
          { $match: filter },
          ...countCertificates,
          {
            $sort: {
              certificatesCount: sort === 'certificates_desc' ? -1 : 1,
              'properties.fullName': 1,
            },
          },
          ...paginate,
        ]
      : [{ $match: filter }, { $sort: { 'properties.fullName': 1 } }, ...paginate, ...countCertificates];

    const [items, totalItems] = await Promise.all([
      this.memberModel.aggregate(pipeline).allowDiskUse(true).exec(),
      this.memberModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum),
      currentPage: pageNum,
    };
  }

  async getMemberDetail(memberId: string) {
    const member = await this.memberModel
      .findById(this.toObjectId(memberId, 'memberId'), { 'properties.password': 0 })
      .lean<any>()
      .exec();
    if (!member) throw new NotFoundException('No se encontró el miembro');

    const user =
      member.userId && Types.ObjectId.isValid(String(member.userId))
        ? await this.userModel.findById(String(member.userId)).lean<any>().exec()
        : null;

    const certificates = await this.getMemberCertificates([member._id as Types.ObjectId], false);
    return { member, user, certificates };
  }

  // Edita los datos con los que se genera el certificado de un asistente.
  // Los datos base son del miembro (afectan todos sus certificados); los
  // atributos son solo de este attendee.
  async updateAttendeeData(attendeeId: string, dto: UpdateAttendeeDataDto) {
    const attendee = await this.attendeeModel
      .findById(this.toObjectId(attendeeId, 'attendeeId'))
      .exec();
    if (!attendee) throw new NotFoundException('No se encontró el asistente');

    if (dto.member && attendee.memberId) {
      const patch: Record<string, string> = {};
      for (const key of MEMBER_BASE_KEYS) {
        if (dto.member[key] !== undefined) {
          const value = String(dto.member[key] ?? '').trim();
          patch[`properties.${key}`] =
            key === 'email' ? normalizeEmail(value) : key === 'idNumber' ? normalizeIdNumber(value) : value;
        }
      }
      if (patch['properties.email'] || patch['properties.idNumber']) {
        await this.assertNoDuplicateMember(attendee.memberId, patch);
      }
      if (Object.keys(patch).length) {
        await this.memberModel.updateOne({ _id: attendee.memberId }, { $set: patch }).exec();
      }
    }

    if (dto.attributes) {
      const { root, properties } = this.splitAttributes(dto.attributes);
      Object.assign(attendee, root);
      attendee.properties = { ...(attendee.properties || {}), ...properties };
      attendee.markModified('properties');
    }
    if (dto.attended !== undefined) attendee.attended = dto.attended;
    await attendee.save();

    return this.getRenderData(String(attendee._id));
  }

  async updateMemberProperties(memberId: string, dto: UpdateMemberPropertiesDto) {
    const id = this.toObjectId(memberId, 'memberId');
    const member = await this.memberModel.findById(id).lean<any>().exec();
    if (!member) throw new NotFoundException('No se encontró el miembro');

    // Claves válidas: sin operadores de Mongo ni rutas anidadas; la contraseña
    // no se toca desde aquí
    const validKey = (key: string) =>
      /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key) && key !== 'password';
    const required = ['fullName'];

    const $set: Record<string, any> = {};
    for (const [key, raw] of Object.entries(dto.set || {})) {
      if (!validKey(key)) throw new BadRequestException(`Nombre de dato inválido: "${key}"`);
      let value: any = typeof raw === 'string' ? raw.trim() : raw;
      if (key === 'email') value = normalizeEmail(value);
      if (key === 'idNumber') value = normalizeIdNumber(value);
      if (required.includes(key) && isEmpty(value)) {
        throw new BadRequestException('El nombre no puede quedar vacío');
      }
      $set[`properties.${key}`] = value;
    }

    const $unset: Record<string, ''> = {};
    for (const key of dto.unset || []) {
      if (!validKey(key)) throw new BadRequestException(`Nombre de dato inválido: "${key}"`);
      if (MEMBER_BASE_KEYS.includes(key)) {
        throw new BadRequestException(`El dato "${key}" no se puede eliminar, solo editar`);
      }
      if (`properties.${key}` in $set) continue;
      $unset[`properties.${key}`] = '';
    }

    if ($set['properties.email'] || $set['properties.idNumber']) {
      await this.assertNoDuplicateMember(id, $set);
    }

    const update: Record<string, any> = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    if (Object.keys(update).length) {
      await this.memberModel.updateOne({ _id: id }, update).exec();
    }
    return this.getMemberDetail(memberId);
  }

  private async assertNoDuplicateMember(
    memberId: Types.ObjectId,
    patch: Record<string, string>,
  ) {
    const member = await this.memberModel.findById(memberId).lean<any>().exec();
    const or: any[] = [];
    if (patch['properties.email']) or.push({ 'properties.email': patch['properties.email'] });
    if (patch['properties.idNumber']) or.push({ 'properties.idNumber': patch['properties.idNumber'] });
    const duplicate = await this.memberModel
      .findOne({ _id: { $ne: memberId }, organizationId: member?.organizationId, $or: or })
      .collation(LOOSE_COLLATION)
      .lean<any>()
      .exec();
    if (duplicate) {
      throw new BadRequestException(
        `Ya existe otro miembro con ese correo o documento (${duplicate.properties?.fullName || duplicate._id})`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Consulta pública
  // ---------------------------------------------------------------------------

  // Desde la landing del correo: el asistente sin documento lo completa antes de
  // descargar. Solo se permite si el miembro no tiene un documento real.
  async completeIdNumber(attendeeId: string, rawIdNumber: string) {
    const attendee = await this.attendeeModel
      .findById(this.toObjectId(attendeeId, 'attendeeId'))
      .lean<any>()
      .exec();
    if (!attendee?.memberId) throw new NotFoundException('No se encontró el certificado');

    const member = await this.memberModel.findById(attendee.memberId).lean<any>().exec();
    if (!member) throw new NotFoundException('No se encontró el miembro');
    if (!isMissingIdNumber(member.properties?.idNumber)) {
      throw new BadRequestException('Tu número de identificación ya está registrado');
    }

    const idNumber = normalizeIdNumber(rawIdNumber);
    if (!/^[A-Za-z0-9]{5,20}$/.test(idNumber) || isMissingIdNumber(idNumber)) {
      throw new BadRequestException('Escribe un número de identificación válido (solo números o letras)');
    }
    const patch = { 'properties.idNumber': idNumber };
    await this.assertNoDuplicateMember(member._id, patch);
    await this.memberModel.updateOne({ _id: member._id }, { $set: patch }).exec();

    return this.getRenderData(attendeeId);
  }

  async publicSearch(organizationId: string, rawQuery: string) {
    const orgId = this.toObjectId(organizationId, 'organizationId');
    const q = String(rawQuery ?? '').trim();
    if (q.length < 3) {
      throw new BadRequestException('Escribe al menos 3 caracteres');
    }

    let members: Member[] = [];
    if (q.includes('@')) {
      members = await this.memberModel
        .find({ organizationId: orgId, 'properties.email': normalizeEmail(q) })
        .collation(LOOSE_COLLATION)
        .exec();
    } else if (/^[\d.\s,-]+$/.test(q)) {
      const id = normalizeIdNumber(q);
      members = await this.memberModel
        .find({
          organizationId: orgId,
          'properties.idNumber': { $in: [id, q, ...(isNaN(Number(id)) ? [] : [Number(id)])] },
        })
        .exec();
    } else {
      const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
      if (!tokens.length) throw new BadRequestException('Escribe un nombre válido');
      const filter = {
        organizationId: orgId,
        $and: tokens.map((token) => ({
          'properties.fullName': {
            $regex: `(^|\\s)${accentInsensitivePattern(token)}`,
            $options: 'i',
          },
        })),
      };
      members = await this.memberModel.find(filter).limit(25).exec();

      // Varias personas distintas con ese nombre: pedir más precisión
      const distinctPeople = new Set(
        members.map(
          (m) =>
            normalizeIdNumber(m.properties?.idNumber) ||
            normalizeEmail(m.properties?.email) ||
            String(m._id),
        ),
      );
      if (distinctPeople.size > 1) {
        return {
          status: 'ambiguous',
          count: distinctPeople.size,
          message:
            'Encontramos varias personas con ese nombre. Escribe tu nombre completo, tu número de identificación o tu correo.',
        };
      }
    }

    if (!members.length) {
      return { status: 'not_found', message: 'No encontramos certificados con esos datos' };
    }

    const main = members[0];
    const certificates = await this.getMemberCertificates(
      members.map((m) => m._id as Types.ObjectId),
      true,
    );

    return {
      status: 'found',
      member: {
        fullName: main.properties?.fullName ?? '',
        email: maskEmail(main.properties?.email),
        idNumber: maskIdNumber(String(main.properties?.idNumber ?? '')),
      },
      certificates,
    };
  }

  // Certificados (attendees) de uno o varios miembros, con el evento y si el
  // evento tiene diseño de certificado
  private async getMemberCertificates(memberIds: Types.ObjectId[], onlyAvailable: boolean) {
    const match: Record<string, any> = { memberId: { $in: memberIds } };
    if (onlyAvailable) match.attended = true;

    const items = await this.attendeeModel
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'events',
            localField: 'eventId',
            foreignField: '_id',
            as: 'event',
            pipeline: [{ $project: { name: 1, startDate: 1, endDate: 1 } }],
          },
        },
        { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'certificates',
            localField: 'eventId',
            foreignField: 'eventId',
            as: 'certificate',
            pipeline: [{ $project: { _id: 1 } }],
          },
        },
        {
          $project: {
            _id: 1,
            eventId: 1,
            memberId: 1,
            attended: 1,
            typeAttendee: 1,
            certificationHours: 1,
            properties: 1,
            certificateDownloads: { $ifNull: ['$certificateDownloads', 0] },
            event: 1,
            hasCertificate: { $gt: [{ $size: '$certificate' }, 0] },
            createdAt: 1,
          },
        },
        { $sort: { 'event.startDate': -1, createdAt: -1 } },
      ])
      .exec();

    return onlyAvailable ? items.filter((item) => item.hasCertificate) : items;
  }

  // ---------------------------------------------------------------------------
  // Datos para generar la imagen del certificado
  // ---------------------------------------------------------------------------

  async getRenderData(attendeeId: string) {
    const attendee = await this.attendeeModel
      .findById(this.toObjectId(attendeeId, 'attendeeId'))
      .lean<any>()
      .exec();
    if (!attendee) throw new NotFoundException('No se encontró el asistente');
    return this.buildRenderData(attendee);
  }

  // Compatibilidad con los enlaces /certificate/:eventId|certificateId/:userId|memberId
  // que usa la app
  async getLegacyRenderData(eventOrCertificateId: string, userOrMemberId: string) {
    const refId = this.toObjectId(eventOrCertificateId, 'eventId');
    const personId = this.toObjectId(userOrMemberId, 'userId');
    const certificate = await this.certificateModel.findById(refId).lean<any>().exec();
    const eventId = certificate ? certificate.eventId : refId;

    const attendee = await this.attendeeModel
      .findOne({ eventId, attended: true, $or: [{ userId: personId }, { memberId: personId }] })
      .lean<any>()
      .exec();
    if (!attendee) throw new NotFoundException('No se encontró el usuario en este evento');
    return this.buildRenderData(attendee);
  }

  private async buildRenderData(attendee: any) {
    const [member, event, certificate] = await Promise.all([
      attendee.memberId ? this.memberModel.findById(attendee.memberId).lean<any>().exec() : null,
      this.eventModel.findById(attendee.eventId, { name: 1, startDate: 1, endDate: 1, organizationId: 1 }).lean<any>().exec(),
      this.findEventCertificate(attendee.eventId),
    ]);
    if (!certificate) {
      throw new NotFoundException('El evento todavía no tiene certificado');
    }

    const memberProps = { ...(member?.properties || {}) };
    delete memberProps.password;

    return {
      missingIdNumber: isMissingIdNumber(memberProps.idNumber),
      attendee: {
        _id: attendee._id,
        eventId: attendee.eventId,
        memberId: attendee.memberId,
        userId: attendee.userId,
        attended: attendee.attended,
        typeAttendee: attendee.typeAttendee ?? '',
        certificationHours: attendee.certificationHours ?? '',
        properties: attendee.properties || {},
        certificateDownloads: attendee.certificateDownloads ?? 0,
      },
      member: member ? { _id: member._id, properties: memberProps } : null,
      event,
      certificate: {
        _id: certificate._id,
        elements: certificate.elements,
        size: certificate.size,
        fields: certificate.fields || [],
      },
      values: {
        ...memberProps,
        ...(attendee.properties || {}),
        typeAttendee: attendee.typeAttendee ?? '',
        certificationHours: attendee.certificationHours ?? '',
        eventName: event?.name ?? '',
      },
    };
  }

  private async findEventCertificate(eventId: Types.ObjectId) {
    return this.certificateModel
      .findOne({ eventId })
      .sort({ updatedAt: -1 })
      .lean<any>()
      .exec();
  }

  private toObjectId(value: string, name: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} inválido`);
    }
    return new Types.ObjectId(value);
  }
}
