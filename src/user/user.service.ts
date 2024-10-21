import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { User } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = new this.userModel(createUserDto);
    return newUser.save();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, {
        new: true,
      })
      .exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findAll(paginationDto: PaginationDto): Promise<{
    items: User[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const totalItems = await this.userModel.countDocuments().exec();
    const items = await this.userModel.find().skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  async findWithFilters(
    filters: Partial<User>,
    paginationDto: PaginationDto,
  ): Promise<{
    items: User[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filterQuery: FilterQuery<User> = {};

    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        if (key === 'firebaseUid') {
          filterQuery[key] = { $regex: filters[key], $options: 'i' };
        }
      }
    });

    const totalItems = await this.userModel.countDocuments(filterQuery).exec();
    const items = await this.userModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return { items, totalItems, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async remove(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async updatePushToken(userId: string, expoPushToken: string): Promise<User> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.expoPushToken = expoPushToken;
    return user.save();
  }
}
