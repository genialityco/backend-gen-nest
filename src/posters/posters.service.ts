import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Poster } from './interfaces/poster.interface';
import { FilterQuery, Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreatePosterDto } from './dto/create-poster.dto';
import { UpdatePosterDto } from './dto/update-poster.dto';
import { findWithFilters } from 'src/common/common.service';

@Injectable()
export class PostersService {
  constructor(@InjectModel('Poster') private PosterModel: Model<Poster>) {}

  // Crear un nuevo poster
  async create(posterDto: CreatePosterDto): Promise<Poster> {
    const newPoster = new this.PosterModel(posterDto);
    return newPoster.save();
  }

  // Actualizar un poster por ID
  async update(id: string, posterDto: UpdatePosterDto): Promise<Poster | null> {
    return this.PosterModel.findByIdAndUpdate(id, posterDto, {
      new: true,
    }).exec();
  }

  // Obtener todos los posters con paginación
  async findAll(
    paginationDto: PaginationDto,
    title_like: string,
    category_like: string,
    authors_like: string,
    topic_like: string,
  ): Promise<{
    items: Poster[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10, _start, _end } = paginationDto;
    let skip = 0;
    let howmany = limit;
    let resultpage = page;
    console.log('paginationDto', _start, _end);

    if (_start !== undefined && _end !== undefined) {
      skip = _start;
      howmany = _end - _start;
      resultpage = howmany == 0 ? 0 : Math.floor(_start / howmany) + 1;
    } else {
      skip = (page - 1) * limit;
      howmany = limit;
      resultpage = page;
    }

    const filterQuery: FilterQuery<Poster> = {};

    const filters = [];
    if (title_like)
      filters.push({ title: { $regex: new RegExp(title_like, 'i') } });
    if (category_like)
      filters.push({ category: { $regex: new RegExp(category_like, 'i') } });
    if (authors_like)
      filters.push({ authors: { $regex: new RegExp(authors_like, 'i') } });
    if (topic_like)
      filters.push({ topic: { $regex: new RegExp(topic_like, 'i') } });

    filterQuery.$and = filters;

    const totalItems =
      await this.PosterModel.countDocuments(filterQuery).exec();
    const items = await this.PosterModel.find(filterQuery)
      .skip(skip)
      .limit(howmany)
      .exec();

    const totalPages = Math.ceil(totalItems / howmany);

    return { items, totalItems, totalPages, currentPage: resultpage };
  }

  // Buscar posters con filtros y paginación
  async findWithFilters(
    paginationDto: PaginationDto,
  ): Promise<{
    items: Poster[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    return findWithFilters<Poster>(
       this.PosterModel,
       paginationDto,
       paginationDto.filters
     );
  }

  // Obtener un poster por ID
  async findOne(id: string): Promise<Poster | null> {
    return this.PosterModel.findById(id).exec();
  }

  // Eliminar un poster por ID
  async remove(id: string): Promise<Poster | null> {
    return this.PosterModel.findByIdAndDelete(id).exec();
  }

  // Método para votar por un poster
  async voteForPoster(posterId: string, userId: string): Promise<Poster> {
    const poster = await this.PosterModel.findById(posterId).exec();

    if (!poster) {
      throw new BadRequestException('Poster not found');
    }

    // Verificar si el usuario ya ha votado
    if (poster.voters.includes(new Types.ObjectId(userId))) {
      throw new BadRequestException('You have already voted for this poster');
    }

    // Incrementar los votos y agregar el usuario a la lista de 'voters'
    poster.votes += 1;
    poster.voters.push(new Types.ObjectId(userId));

    return poster.save();
  }
}
