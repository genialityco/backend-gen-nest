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
import { DocumentService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentInterface } from './interfaces/document.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<DocumentInterface>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: DocumentInterface[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.documentService.findWithFilters(
      query,
      paginationDto,
    );
    return result.items.length > 0
      ? new ResponseDto('success', 'Documentos encontrados', result)
      : new ResponseDto('error', 'No se encontraron documentos');
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<DocumentInterface>> {
    const result = await this.documentService.findOne(id);
    return result
      ? new ResponseDto('success', 'Documento encontrado', result)
      : new ResponseDto('error', 'No se encontró el documento');
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto): Promise<
    ResponseDto<{
      items: DocumentInterface[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.documentService.findAll(paginationDto);
    return result.items.length > 0
      ? new ResponseDto('success', 'Documentos encontrados', result)
      : new ResponseDto('error', 'No se encontraron documentos');
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createDocumentDto: CreateDocumentDto,
  ): Promise<ResponseDto<DocumentInterface>> {
    const result = await this.documentService.create(createDocumentDto);
    return result
      ? new ResponseDto('success', 'Documento creado', result)
      : new ResponseDto('error', 'No se pudo crear el documento');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateDocumentDto: UpdateDocumentDto,
  ): Promise<ResponseDto<DocumentInterface>> {
    const result = await this.documentService.update(id, updateDocumentDto);
    return result
      ? new ResponseDto('success', 'Documento actualizado', result)
      : new ResponseDto('error', 'No se pudo actualizar el documento');
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ): Promise<ResponseDto<DocumentInterface>> {
    const result = await this.documentService.remove(id);
    return result
      ? new ResponseDto('success', 'Documento eliminado', result)
      : new ResponseDto('error', 'No se pudo eliminar el documento');
  }
}
