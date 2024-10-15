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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './interfaces/room.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<Room>,
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.roomsService.findWithFilters(
      query,
      paginationDto,
    );
    return new ResponseDto('success', 'Salas encontradas', result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Room>> {
    const result = await this.roomsService.findOne(id);
    return result
      ? new ResponseDto('success', 'Sala encontrada', result)
      : new ResponseDto('error', 'No se encontró la sala');
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ResponseDto<any>> {
    const result = await this.roomsService.findAll(paginationDto);
    return new ResponseDto('success', 'Salas encontradas', result);
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createRoomDto: CreateRoomDto,
  ): Promise<ResponseDto<Room>> {
    const result = await this.roomsService.create(createRoomDto);
    return result
      ? new ResponseDto('success', 'Sala creada', result)
      : new ResponseDto('error', 'No se pudo crear la sala');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateRoomDto: UpdateRoomDto,
  ): Promise<ResponseDto<Room>> {
    const result = await this.roomsService.update(id, updateRoomDto);
    return result
      ? new ResponseDto('success', 'Sala actualizada', result)
      : new ResponseDto('error', 'No se pudo actualizar la sala');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Room>> {
    const result = await this.roomsService.remove(id);
    return result
      ? new ResponseDto('success', 'Sala eliminada', result)
      : new ResponseDto('error', 'No se pudo eliminar la sala');
  }
}
