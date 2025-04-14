import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Speaker } from './interfaces/speakers.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class SpeakersService {
  constructor(@InjectModel('Speaker') private SpeakerModel: Model<Speaker>) {}

  async create(createSpeakerDto: any): Promise<Speaker> {
    const newSpeaker = new this.SpeakerModel(createSpeakerDto);
    return newSpeaker.save();
  }

  async findAll(
    paginationDto: PaginationDto,
    names_like: string,
  ): Promise<{
    items: Speaker[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 200, _start, _end } = paginationDto;
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

    const filterQuery: FilterQuery<Speaker> = {};
    if (names_like) {
      filterQuery.$or = [
        { names: { $regex: new RegExp(names_like, 'i') } },
        // { authors: { $regex: new RegExp(searchTerm, 'i') } },
        // { topic: { $regex: new RegExp(searchTerm, 'i') } },
        // { institution: { $regex: new RegExp(searchTerm, 'i') } },
      ];
    }

    const totalItems =
      await this.SpeakerModel.countDocuments(filterQuery).exec();
    const items = await this.SpeakerModel.find(filterQuery)
      .skip(skip)
      .limit(howmany)
      .exec();

    const totalPages = Math.ceil(totalItems / howmany);

    return { items, totalItems, totalPages, currentPage: resultpage };
  }

  async findWithFilters(
    filters: Partial<Speaker>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Speaker[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 100 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<Speaker> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value) {
        if (key === 'eventId' || key.endsWith('Id')) {
          filterQuery[key] = new Types.ObjectId(value as string);
        } else if (typeof value === 'string') {
          filterQuery[key] = { $regex: value, $options: 'i' };
        } else {
          filterQuery[key] = value;
        }
      }
    });

    const totalItems =
      await this.SpeakerModel.countDocuments(filterQuery).exec();
    const items = await this.SpeakerModel.find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<Speaker> {
    const speaker = await this.SpeakerModel.findById(id).exec();
    if (!speaker) {
      throw new NotFoundException('Speaker no encontrado');
    }
    return speaker;
  }

  async update(id: string, updateSpeakerDto: any): Promise<Speaker> {
    const speaker = await this.SpeakerModel.findByIdAndUpdate(
      id,
      updateSpeakerDto,
      {
        new: true,
      },
    ).exec();
    if (!speaker) {
      throw new NotFoundException('Speaker no encontrado');
    }
    return speaker;
  }

  async remove(id: string): Promise<Speaker> {
    const speaker = await this.SpeakerModel.findByIdAndDelete(id).exec();
    if (!speaker) {
      throw new NotFoundException('Speaker no encontrado');
    }
    return speaker;
  }
}
