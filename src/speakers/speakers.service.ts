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

  async findAll(paginationDto: PaginationDto): Promise<{
    items: Speaker[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.SpeakerModel.countDocuments().exec();
    const items = await this.SpeakerModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
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
    const { page = 1, limit = 25 } = paginationDto;
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
