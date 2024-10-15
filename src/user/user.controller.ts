import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './interfaces/user.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<User>,
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.userService.findWithFilters(query, paginationDto);
    return new ResponseDto('success', 'Usuarios encontrados', result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<User>> {
    const result = await this.userService.findOne(id);
    return new ResponseDto('success', 'Usuario encontrado', result);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.userService.findAll(paginationDto);
    return new ResponseDto('success', 'Usuarios encontrados', result);
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createUserDto: CreateUserDto,
  ): Promise<ResponseDto<User>> {
    const result = await this.userService.create(createUserDto);
    return new ResponseDto('success', 'Usuario creado', result);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateUserDto: UpdateUserDto,
  ): Promise<ResponseDto<User>> {
    const result = await this.userService.update(id, updateUserDto);
    return new ResponseDto('success', 'Usuario actualizado', result);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<User>> {
    const result = await this.userService.remove(id);
    return new ResponseDto('success', 'Usuario eliminado', result);
  }
}
