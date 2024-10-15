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
import { MemberService } from './member.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './interfaces/member.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<Member>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: Member[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.memberService.findWithFilters(
      query,
      paginationDto,
    );
    return result.items.length > 0
      ? new ResponseDto('success', 'Miembros encontrados', result)
      : new ResponseDto('error', 'No se encontraron miembros');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Member>> {
    const result = await this.memberService.findOne(id);
    return result
      ? new ResponseDto('success', 'Miembro encontrado', result)
      : new ResponseDto('error', 'No se encontró el miembro');
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto): Promise<
    ResponseDto<{
      items: Member[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.memberService.findAll(paginationDto);
    return result.items.length > 0
      ? new ResponseDto('success', 'Miembros encontrados', result)
      : new ResponseDto('error', 'No se encontraron miembros');
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createMemberDto: CreateMemberDto,
  ): Promise<ResponseDto<Member>> {
    const result = await this.memberService.create(createMemberDto);
    return result
      ? new ResponseDto('success', 'Miembro creado', result)
      : new ResponseDto('error', 'No se pudo crear el miembro');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateMemberDto: UpdateMemberDto,
  ): Promise<ResponseDto<Member>> {
    const result = await this.memberService.update(id, updateMemberDto);
    return result
      ? new ResponseDto('success', 'Miembro actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el miembro');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Member>> {
    const result = await this.memberService.remove(id);
    return result
      ? new ResponseDto('success', 'Miembro eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el miembro');
  }
}
