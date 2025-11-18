import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { News } from './interfaces/news.interface';
import { Model } from 'mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { findWithFilters } from 'src/common/common.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NewsService {
  constructor(@InjectModel('News') private newsModel: Model<News>) {}

  // Crear una nueva noticia (soporta documentos adjuntos)
  async create(createNewsDto: CreateNewsDto): Promise<News> {
    // createNewsDto.documents debe ser un array de objetos { id, name, type, url } si se provee
    const newNews = new this.newsModel(createNewsDto);
    return newNews.save();
  }

  // Actualizar una noticia por ID (soporta documentos adjuntos)
  async update(id: string, updateNewsDto: UpdateNewsDto): Promise<News | null> {
    // updateNewsDto.documents debe ser un array de objetos { id, name, type, url } si se provee
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
    paginationDto: PaginationDto,
  ): Promise<{
    items: News[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
   return findWithFilters<News>(
           this.newsModel,
           paginationDto,
           paginationDto.filters
         );
  }

  // Obtener una noticia por ID
  async findOne(id: string): Promise<News | null> {
    return this.newsModel.findById(id).exec();
  }

  // Eliminar una noticia por ID
  async remove(id: string): Promise<News | null> {
    return this.newsModel.findByIdAndDelete(id).exec();
  }

  async processScheduledNews(): Promise<News[] | void> {
      try {
      const now = new Date();
      const oneDayBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      //console.log("⏰ Procesando notificaciones programadas a las:", now);
        // Buscar solo los que tienen scheduledAt definido, ya vencido, y no enviados
        await this.newsModel.updateMany(
          { scheduledAt: { $exists: true, $lte: now , $gte: oneDayBefore }, isPublic: false,  },
          { $set: { isPublic: true } }
        );
    
      } catch (error) {
        console.error('Error al procesar notificaciones programadas:', error);
      }
    }
      @Cron(CronExpression.EVERY_5_MINUTES)
      async handleCron() {
        await this.processScheduledNews();
      }
}
