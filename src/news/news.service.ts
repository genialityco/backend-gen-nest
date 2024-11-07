import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { News } from './interfaces/news.interface';
import { FilterQuery, Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(@InjectModel('News') private newsModel: Model<News>) {}

  // Crear una nueva noticia
  async create(createNewsDto: CreateNewsDto): Promise<News> {
    const newNews = new this.newsModel(createNewsDto);
    return newNews.save();
  }

  // Actualizar una noticia por ID
  async update(id: string, updateNewsDto: UpdateNewsDto): Promise<News | null> {
    return this.newsModel
      .findByIdAndUpdate(id, updateNewsDto, {
        new: true,
      })
      .exec();
  }

  // Obtener todas las noticias con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: News[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.newsModel.countDocuments().exec();
    const items = await this.newsModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar noticias con filtros y paginación
  async findWithFilters(
    filters: Partial<News & { search?: string }>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: News[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<News> = {};

    const filterableFields = Object.keys(filters).filter(
      (key) => key !== 'page' && key !== 'limit',
    );

    // Si hay un término de búsqueda general
    if (filters.search) {
      const searchTerm = filters.search as string;
      filterQuery.$or = [
        { title: { $regex: new RegExp(searchTerm, 'i') } },
        { content: { $regex: new RegExp(searchTerm, 'i') } },
      ];
    }

    // Aplicar otros filtros
    filterableFields.forEach((key) => {
      if (filters[key] && key !== 'search') {
        if (key === 'organizationId') {
          filterQuery[key] = new Types.ObjectId(filters[key]);
        } else if (typeof filters[key] === 'string') {
          filterQuery[key] = { $regex: new RegExp(filters[key], 'i') };
        } else {
          filterQuery[key] = filters[key];
        }
      }
    });

    const totalItems = await this.newsModel.countDocuments(filterQuery).exec();
    const items = await this.newsModel
      .find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Obtener una noticia por ID
  async findOne(id: string): Promise<News | null> {
    return this.newsModel.findById(id).exec();
  }

  // Eliminar una noticia por ID
  async remove(id: string): Promise<News | null> {
    return this.newsModel.findByIdAndDelete(id).exec();
  }
}
