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

  private normalizeMediaUrl(url: any): string | null {
    if (typeof url !== 'string') return null;

    const trimmed = url.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') return null;

    // 1) Corrige doble-encoding: %25XX -> %XX (ej: %2520 -> %20)
    let fixed = trimmed.replace(/%25([0-9A-Fa-f]{2})/g, '%$1');

    // 2) Cambia espacios por %20 (por si quedó alguno)
    fixed = fixed.replace(/ /g, '%20');

    return fixed;
  }

  private normalizeVideosInHtml(html?: string): string {
    if (!html) return html;

    let out = html.replace(
      /<video([^>]*?)\ssrc="([^"]+)"([^>]*)>\s*<\/video>/gi,
      (_match, pre, src, post) => {
        const safeSrc = this.normalizeMediaUrl(src);

        // 🚫 Si no hay URL válida, eliminamos el bloque de video (o podrías devolver un placeholder)
        if (!safeSrc) return '';

        const attrs = `${pre} ${post}`;

        const hasControls = /\scontrols(\s|=|>)/i.test(attrs);
        const hasMuted = /\smuted(\s|=|>)/i.test(attrs);
        const hasPreload = /\spreload(\s*=\s*")/i.test(attrs);
        const hasPlaysInline = /\splaysinline(\s|=|>)/i.test(attrs);

        const injected =
          `${pre} ${post}` +
          (hasControls ? '' : ' controls') +
          (hasMuted ? '' : ' muted') +
          (hasPreload ? '' : ` preload="metadata"`) +
          (hasPlaysInline ? '' : ' playsinline webkit-playsinline');

        const styleMatch = injected.match(/\sstyle="([^"]*)"/i);
        const existingStyle = styleMatch?.[1] ?? '';
        const mergedStyle =
          `${existingStyle}; max-width:100%; display:block; margin:10px auto; background:#000;`
            .replace(/;;+/g, ';')
            .trim();

        const withoutStyle = injected.replace(/\sstyle="[^"]*"/i, '');

        return `
<video ${withoutStyle} style="${mergedStyle}">
  <source src="${safeSrc}" type="video/mp4" />
</video>
      `.trim();
      },
    );

    // Si ya existía <source src="...">, solo arreglamos el src
    out = out.replace(
      /<source([^>]*?)\ssrc="([^"]+)"([^>]*?)\/?>/gi,
      (_m, a, src, b) => {
        const safeSrc = this.normalizeMediaUrl(src);
        if (!safeSrc) return ''; // si es inválido, eliminamos el source
        return `<source${a} src="${safeSrc}"${b} />`;
      },
    );

    return out;
  }

  // Crear una nueva noticia (soporta documentos adjuntos)
  async create(createNewsDto: CreateNewsDto): Promise<News> {
    const newsData = { ...createNewsDto };
    if (newsData.content) {
      newsData.content = this.normalizeVideosInHtml(newsData.content);
    }
    const newNews = new this.newsModel(newsData);
    return newNews.save();
  }

  async update(id: string, updateNewsDto: UpdateNewsDto): Promise<News | null> {
    const newsData = { ...updateNewsDto };
    if (newsData.content) {
      newsData.content = this.normalizeVideosInHtml(newsData.content);
    }
    return this.newsModel.findByIdAndUpdate(id, newsData, { new: true }).exec();
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
  async findWithFilters(paginationDto: PaginationDto): Promise<{
    items: News[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    return findWithFilters<News>(
      this.newsModel,
      paginationDto,
      paginationDto.filters,
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
        {
          scheduledAt: { $exists: true, $lte: now, $gte: oneDayBefore },
          isPublic: false,
        },
        { $set: { isPublic: true } },
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
