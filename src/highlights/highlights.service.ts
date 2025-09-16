import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Highlight } from './interfaces/highlight.interface';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { findWithFilters } from 'src/common/common.service';


@Injectable()
export class HighlightsService {
  constructor(
    @InjectModel('Highlight') private highlightModel: Model<Highlight>,
  ) {}

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

  // Obtener un highlight por ID
  async findOne(id: string): Promise<Highlight | null> {
    return await this.highlightModel.findById(id).populate('eventId');
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
