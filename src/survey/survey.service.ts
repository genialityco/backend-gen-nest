import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Survey } from './interfaces/survey.interface';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class SurveyService {
  constructor(@InjectModel('Survey') private surveyModel: Model<Survey>) {}

  async create(createSurveyDto: CreateSurveyDto): Promise<Survey> {
    const newSurvey = new this.surveyModel(createSurveyDto);
    return newSurvey.save();
  }

  async findAll(paginationDto: PaginationDto): Promise<{
    items: Survey[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.surveyModel.countDocuments().exec();
    const items = await this.surveyModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  async findWithFilters(
    filters: Partial<Survey>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: Survey[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<Survey> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value) {
        if (key.endsWith('Id')) {
          filterQuery[key] = new Types.ObjectId(value as string);
        } else if (typeof value === 'string') {
          filterQuery[key] = { $regex: value, $options: 'i' };
        } else {
          filterQuery[key] = value;
        }
      }
    });

    const totalItems = await this.surveyModel
      .countDocuments(filterQuery)
      .exec();
    const items = await this.surveyModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<Survey> {
    const survey = await this.surveyModel.findById(id).exec();
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }
    return survey;
  }

  async update(id: string, updateSurveyDto: UpdateSurveyDto): Promise<Survey> {
    const survey = await this.surveyModel
      .findByIdAndUpdate(id, updateSurveyDto, {
        new: true,
      })
      .exec();
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }
    return survey;
  }

  async remove(id: string): Promise<Survey> {
    const survey = await this.surveyModel.findByIdAndDelete(id).exec();
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }
    return survey;
  }
}
