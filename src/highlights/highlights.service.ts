import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Highlight, ProviderUrl } from './interfaces/highlight.interface';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { findWithFilters } from 'src/common/common.service';

// Orden de preferencia al resolver que video entregar: Bunny primero (CDN
// propio) y Vimeo como respaldo. Cualquier otro proveedor que se agregue a
// providerUrls en el futuro se prueba al final, en el orden en que aparezca.
const PROVIDER_PRIORITY = ['bunny', 'vimeo'];
const VIDEO_CHECK_TIMEOUT_MS = 4000;

@Injectable()
export class HighlightsService {
  constructor(
    @InjectModel('Highlight') private highlightModel: Model<Highlight>,
  ) {}

  private async pingUrl(
    url: string,
    method: 'head' | 'get',
  ): Promise<number | null> {
    try {
      const response = await axios.request({
        url,
        method,
        timeout: VIDEO_CHECK_TIMEOUT_MS,
        maxRedirects: 5,
        validateStatus: () => true,
        responseType: method === 'get' ? 'stream' : undefined,
        headers: method === 'get' ? { Range: 'bytes=0-1023' } : undefined,
      });
      if (method === 'get') {
        (response.data as any)?.destroy?.();
      }
      return response.status;
    } catch {
      return null;
    }
  }

  // Algunos proveedores no soportan HEAD (405/403); en ese caso se intenta
  // un GET acotado (Range) antes de darlo por caido.
  private async isVideoUrlReachable(url: string): Promise<boolean> {
    const headStatus = await this.pingUrl(url, 'head');
    if (headStatus !== null && headStatus < 400) return true;

    const getStatus = await this.pingUrl(url, 'get');
    return getStatus !== null && getStatus < 400;
  }

  // Prueba las entradas de providerUrls en orden de preferencia y devuelve
  // la primera que responde. Si ninguna responde, cae al vimeoUrl legacy
  // (si no estaba ya entre las entradas probadas).
  private async resolveWorkingVideo(
    providerUrls: ProviderUrl[] | undefined,
    fallbackVimeoUrl?: string,
  ): Promise<{ url: string | null; provider: string | null }> {
    const entries = [...(providerUrls || [])].sort((a, b) => {
      const ai = PROVIDER_PRIORITY.indexOf(a.provider);
      const bi = PROVIDER_PRIORITY.indexOf(b.provider);
      return (
        (ai === -1 ? PROVIDER_PRIORITY.length : ai) -
        (bi === -1 ? PROVIDER_PRIORITY.length : bi)
      );
    });

    for (const entry of entries) {
      if (entry?.url && (await this.isVideoUrlReachable(entry.url))) {
        return { url: entry.url, provider: entry.provider };
      }
    }

    const alreadyTriedVimeo = entries.some((e) => e.provider === 'vimeo');
    if (fallbackVimeoUrl && !alreadyTriedVimeo) {
      if (await this.isVideoUrlReachable(fallbackVimeoUrl)) {
        return { url: fallbackVimeoUrl, provider: 'vimeo' };
      }
    }

    return { url: null, provider: null };
  }

  // Crear un nuevo highlight
  async create(createHighlightDto: CreateHighlightDto): Promise<Highlight> {
    const newHighlight = new this.highlightModel(createHighlightDto);
    return newHighlight.save();
  }

  // Actualizar un highlight por ID
  async update(
    id: string,
    updateHighlightDto: UpdateHighlightDto,
  ): Promise<Highlight | null> {
    return this.highlightModel
      .findByIdAndUpdate(id, updateHighlightDto, {
        new: true,
      })
      .exec();
  }

  // Obtener todos los highlights con paginación
  async findAll(paginationDto: PaginationDto): Promise<{
    items: Highlight[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 50 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.highlightModel.countDocuments().exec();
    const items = await this.highlightModel
      .find()
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  // Buscar highlights con filtros y paginación
  async findWithFilters(
    paginationDto: PaginationDto,
  ): Promise<{
    items: Highlight[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
   return findWithFilters<Highlight>(
              this.highlightModel,
              paginationDto,
              paginationDto.filters
              
            );
  }

  // Obtener un highlight por ID. Resuelve cual video entregar probando
  // providerUrls en orden de preferencia (Bunny primero, Vimeo de respaldo)
  // y devolviendo el primero que responde; si ninguno responde, videoUrl
  // queda en null (el frontend puede seguir usando vimeoUrl/providerUrls
  // crudos si lo necesita).
  async findOne(id: string): Promise<Highlight | null> {
    const highlight = await this.highlightModel
      .findById(id)
      .populate('eventId');
    if (!highlight) return null;

    const { url, provider } = await this.resolveWorkingVideo(
      highlight.providerUrls,
      highlight.vimeoUrl,
    );

    const result = highlight.toObject();
    result.videoUrl = url;
    result.videoProvider = provider;
    return result as unknown as Highlight;
  }

  // Eliminar un highlight por ID
  async remove(id: string): Promise<Highlight | null> {
    return this.highlightModel.findByIdAndDelete(id).exec();
  }
async eventHasHighlights(eventIds: any): Promise<Record<string, number>> {
  const hasHighlights: Record<string, number> = {};
  for (const id of eventIds) {
    const count = await this.highlightModel.countDocuments({ eventId: id["eventId"] }).exec();
    hasHighlights[id["eventId"]] = count;
  }
  return hasHighlights;
}
}
