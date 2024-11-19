import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Certificate } from './interfaces/certificate.interface';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

@Injectable()
export class CertificateService {
  constructor(
    @InjectModel('Certificate') private certificateModel: Model<Certificate>,
  ) {}

  async create(certificateDto: CreateCertificateDto): Promise<Certificate> {
    const newCertificate = new this.certificateModel(certificateDto);
    return newCertificate.save();
  }

  async update(
    id: string,
    certificateDto: UpdateCertificateDto,
  ): Promise<Certificate | null> {
    return this.certificateModel
      .findByIdAndUpdate(
        id,
        { $set: { elements: certificateDto.elements } },
        { new: true },
      )
      .exec();
  }
  

  async findWithFilters(filters: Partial<Certificate>): Promise<Certificate[]> {
    const filterQuery: FilterQuery<Certificate> = {};

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (key === 'eventId' || key.endsWith('Id')) {
          filterQuery[key] = new Types.ObjectId(value as string);
        } else {
          filterQuery[key] = value;
        }
      }
    });

    return this.certificateModel.find(filterQuery).exec();
  }

  async findAll(): Promise<Certificate[]> {
    return this.certificateModel.find().exec();
  }

  async findOne(id: string): Promise<Certificate | null> {
    return this.certificateModel.findById(id).exec();
  }

  async remove(id: string): Promise<Certificate | null> {
    return this.certificateModel.findByIdAndDelete(id).exec();
  }
}
