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
  Patch,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { News } from './interfaces/news.interface';
import { ResponseDto } from 'src/common/response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('search')
  async findWithFilters(
    @Query() query: Partial<News & { search?: string }>,
    @Query() paginationDto: PaginationDto,
  ): Promise<
    ResponseDto<{
      items: News[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }>
  > {
    const result = await this.newsService.findWithFilters(paginationDto);

    return result.items.length > 0
      ? new ResponseDto('success', 'Noticias encontradas', result)
      : new ResponseDto('error', 'No se encontraron noticias');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<News>> {
    const result = await this.newsService.findOne(id);
    return result
      ? new ResponseDto('success', 'Noticia encontrada', result)
      : new ResponseDto('error', 'No se encontró la noticia');
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    console.log('📥 Query params recibidos:', paginationDto); // Debug

    const result = await this.newsService.findWithFilters(paginationDto);

    return {
      data: {
        items: result.items,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      },
    };
  }

  @Post()
  async create(
    @Body(new ValidationPipe()) createNewsDto: CreateNewsDto,
  ): Promise<ResponseDto<News>> {
    const result = await this.newsService.create(createNewsDto);
    return result
      ? new ResponseDto('success', 'Noticia creada', result)
      : new ResponseDto('error', 'No se pudo crear la noticia');
  }

  @Patch(':id')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateNewsDto: UpdateNewsDto,
  ): Promise<ResponseDto<News>> {
    const result = await this.newsService.update(id, updateNewsDto);
    return result
      ? new ResponseDto('success', 'Noticia actualizada', result)
      : new ResponseDto('error', 'No se pudo actualizar la noticia');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto<News>> {
    const result = await this.newsService.remove(id);
    return result
      ? new ResponseDto('success', 'Noticia eliminada', result)
      : new ResponseDto('error', 'No se pudo eliminar la noticia');
  }

  @Patch('public/:id')
  @Put('public/:id')
  async findPublic(@Param('id') id: string) {
    try {
      const result = await this.newsService.findOne(id);
      if (result) {
        const updated = await this.newsService.update(id, {
          isPublic: !result.isPublic,
        });
        return updated;
      }
    } catch (error) {
      console.error('Error toggling public status:', error);
    }
  }
}
