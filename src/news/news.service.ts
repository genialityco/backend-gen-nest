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
    // SIEMPRE guardar con isPublic = false (privada por defecto)
    createNewsDto.isPublic = false;
    // Si hay scheduledAt, asegurar que isPublic sea false
    if (createNewsDto.scheduledAt) {
      createNewsDto.isPublic = false;
    }
    // createNewsDto.documents debe ser un array de objetos { id, name, type, url } si se provee
    const newNews = new this.newsModel(createNewsDto);
    return newNews.save();
  }

  // Actualizar una noticia por ID (soporta documentos adjuntos)
  async update(id: string, updateNewsDto: UpdateNewsDto): Promise<News | null> {
    // Si cambian la fecha programada, resetear estados para reprocesar
    if (updateNewsDto.scheduledAt) {
      updateNewsDto.publishedAt = null;
      // Resetear isPublic a false para que el CRON pueda publicarla cuando llegue la hora
      updateNewsDto.isPublic = false;
    }
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

  async processScheduledNews(): Promise<{ message: string; processed: number }> {
    try {
      const now = new Date();
      console.log('⏰ Procesando noticias programadas a las:', now);
      
      // Buscar todas las noticias programadas (con o sin fecha)
      const allScheduled = await this.newsModel.find({
        scheduledAt: { $exists: true, $ne: null },
      }).exec();

      console.log(`📋 Total de noticias programadas en BD: ${allScheduled.length}`);
      
      // Log detallado de cada noticia
      allScheduled.forEach(news => {
        const scheduledDate = new Date(news.scheduledAt);
        const isReady = scheduledDate <= now && !news.isPublic && !news.publishedAt;
        console.log(
          `   - "${news.title}": ` +
          `scheduledAt=${scheduledDate.toISOString()}, ` +
          `isReady=${isReady}, ` +
          `isPublic=${news.isPublic}, ` +
          `publishedAt=${news.publishedAt}, ` +
          `diff=${Math.floor((scheduledDate.getTime() - now.getTime()) / 1000)}s`
        );
      });

      // Buscar noticias que deben ser publicadas
      // Criterios: scheduledAt <= ahora, isPublic=false, publishedAt=null
      const newsToPublish = await this.newsModel.find({
        scheduledAt: { $exists: true, $ne: null, $lte: now },
        isPublic: false,
        publishedAt: null,
      }).exec();

      console.log(`🔍 Noticias encontradas para publicar: ${newsToPublish.length}`);

      if (newsToPublish.length === 0) {
        return { message: 'No hay noticias programadas para publicar', processed: 0 };
      }

      // Actualizar todas las noticias
      const result = await this.newsModel.updateMany(
        { 
          scheduledAt: { $exists: true, $ne: null, $lte: now }, 
          isPublic: false,
          publishedAt: null
        },
        { 
          $set: { 
            isPublic: true,
            publishedAt: now,
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ ${result.modifiedCount} noticia(s) publicada(s) automáticamente`);
        // Log detallado de las noticias publicadas
        newsToPublish.forEach(news => {
          console.log(`   📰 "${news.title}" (ID: ${news._id}) - Publicada desde: ${news.scheduledAt}`);
        });
      }
      
      return { 
        message: `${result.modifiedCount} noticia(s) actualizada(s)`, 
        processed: result.modifiedCount 
      };
    } catch (error) {
      console.error('❌ Error al procesar noticias programadas:', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    await this.processScheduledNews();
  }

  // Método para verificar estado actual de noticias programadas (para debugging)
  async getScheduledNewsStatus(): Promise<any> {
    const now = new Date();
    const scheduled = await this.newsModel.find({
      scheduledAt: { $exists: true, $ne: null },
    }).exec();

    return {
      currentTime: now,
      totalScheduled: scheduled.length,
      news: scheduled.map(n => ({
        id: n._id,
        title: n.title,
        scheduledAt: n.scheduledAt,
        isPublic: n.isPublic,
        publishedAt: n.publishedAt,
        isReady: new Date(n.scheduledAt) <= now && !n.isPublic && !n.publishedAt,
      })),
    };
  }
}
