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
import { CertificateService } from './certificate.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { Certificate } from './interfaces/certificate.interface';
import { ResponseDto } from 'src/common/response.dto';

@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get()
  async findAll(): Promise<ResponseDto<Certificate[]>> {
    const result = await this.certificateService.findAll();
    return result.length > 0
      ? new ResponseDto('success', 'Certificados encontrados', result)
      : new ResponseDto('error', 'No se encontraron certificados');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<Certificate>> {
    const result = await this.certificateService.findOne(id);
    return result
      ? new ResponseDto('success', 'Certificado encontrado', result)
      : new ResponseDto('error', 'No se encontró el certificado');
  }

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<Certificate>,
  ): Promise<ResponseDto<Certificate[]>> {
    const result = await this.certificateService.findWithFilters(query);
    return result.length > 0
      ? new ResponseDto('success', 'Certificados encontrados', result)
      : new ResponseDto('error', 'No se encontraron certificados');
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createCertificateDto: CreateCertificateDto,
  ): Promise<ResponseDto<Certificate>> {
    const result = await this.certificateService.create(createCertificateDto);
    return result
      ? new ResponseDto('success', 'Certificado creado', result)
      : new ResponseDto('error', 'No se pudo crear el certificado');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateCertificateDto: UpdateCertificateDto,
  ): Promise<ResponseDto<Certificate>> {
    const result = await this.certificateService.update(id, updateCertificateDto);
    return result
      ? new ResponseDto('success', 'Certificado actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el certificado');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<Certificate>> {
    const result = await this.certificateService.remove(id);
    return result
      ? new ResponseDto('success', 'Certificado eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el certificado');
  }
}
