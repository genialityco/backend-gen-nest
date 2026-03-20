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
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './interfaces/user.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { addOrCreateAttendee } from './schemas/user.schema';
import { EmailValidator } from './utils/email.validator';

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

  @Post('updatePushToken')
  async updatePushToken(
    @Body() body: { userId: string; expoPushToken: string },
  ) {
    const { userId, expoPushToken } = body;
    return this.userService.updatePushToken(userId, expoPushToken);
  }

  // 🔍 Endpoint para validar emails ANTES de hacer la carga masiva
  @Post('validate-emails')
  async validateEmails(
    @Body() body: { emails: string[] },
  ): Promise<ResponseDto<any>> {
    if (!body.emails || !Array.isArray(body.emails)) {
      throw new BadRequestException('Debes proporcionar un array de emails');
    }

    const validation = EmailValidator.validateMultipleEmails(body.emails);

    return new ResponseDto(
      'success',
      `Validación completada: ${validation.valid.length} válidos, ${validation.invalid.length} inválidos`,
      {
        valid: validation.valid,
        invalid: validation.invalid,
        summary: {
          total: body.emails.length,
          validCount: validation.valid.length,
          invalidCount: validation.invalid.length,
        },
      },
    );
  }

  // 🚀 Nuevo endpoint para addOrCreateAttendee
  @Post('attendees')
  async addOrCreateAttendee(
    @Body(new ValidationPipe()) payload: addOrCreateAttendee[],
  ): Promise<ResponseDto<any>> {
    const results = [];
    const errors = [];
    const rejected = [];

    console.log('Payload recibido en el controlador:', payload);

    for (let index = 0; index < payload.length; index++) {
      const item = payload[index];

      try {
        // Validar email antes de procesar
        const emailValidation = EmailValidator.cleanAndValidateEmail(
          item.user.email,
        );

        if (!emailValidation.success) {
          rejected.push({
            row: index + 1,
            email: item.user.email,
            reason: emailValidation.error,
          });
          continue;
        }

        const result = await this.userService.addOrCreateAttendee({
          ...item,
          user: {
            ...item.user,
            email: emailValidation.email,
          },
        });
        results.push({
          row: index + 1,
          email: emailValidation.email,
          success: true,
          data: result,
        });
      } catch (error: any) {
        errors.push({
          row: index + 1,
          email: item.user.email,
          reason: error.message || 'Error desconocido',
        });
      }
    }

    const summary = {
      totalProcessed: payload.length,
      successful: results.length,
      rejected: rejected.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new ResponseDto(
      'success',
      `Attendees procesados. ${results.length} exitosos, ${rejected.length} rechazados, ${errors.length} con errores`,
      summary,
    );
  }
}
