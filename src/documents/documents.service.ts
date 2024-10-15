import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DocumentInterface } from './interfaces/document.interface';
import { FilterQuery, Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentService {
  constructor(
    @InjectModel('Document') private DocumentModel: Model<DocumentInterface>,
  ) {}

  // Crear un nuevo documento
  async create(documentDto: CreateDocumentDto): Promise<DocumentInterface> {
    const newDocument = new this.DocumentModel(documentDto);
    return newDocument.save();
  }

  // Actualizar un documento por ID
  async update(
    id: string,
    documentDto: UpdateDocumentDto,
  ): Promise<DocumentInterface | null> {
    return this.DocumentModel.findByIdAndUpdate(id, documentDto, {
      new: true,
    }).exec();
  }

  // Obtener todos los documentos con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: DocumentInterface[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.DocumentModel.countDocuments().exec();
    const items = await this.DocumentModel.find()
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar documentos con filtros y paginación
  async findWithFilters(
    filters: Partial<DocumentInterface>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: DocumentInterface[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<DocumentInterface> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (key === 'eventId' || key.endsWith('Id')) {
          filterQuery[key] = new Types.ObjectId(value as string);
        } else if (typeof value === 'string') {
          filterQuery[key] = { $regex: new RegExp(value, 'i') };
        } else {
          filterQuery[key] = value;
        }
      }
    });

    const totalItems =
      await this.DocumentModel.countDocuments(filterQuery).exec();
    const items = await this.DocumentModel.find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener un documento por ID
  async findOne(id: string): Promise<DocumentInterface | null> {
    return this.DocumentModel.findById(id).exec();
  }

  // Eliminar un documento por ID
  async remove(id: string): Promise<DocumentInterface | null> {
    return this.DocumentModel.findByIdAndDelete(id).exec();
  }
}
