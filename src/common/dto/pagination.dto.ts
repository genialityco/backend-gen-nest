import { IsOptional, IsNumber, Min, IsString, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FilterDto } from '../filters/filter.dto';

// DTO para un sorter individual
export class SorterDto {
  @IsOptional()
  @IsString()
  readonly field?: string;

  @IsOptional()
  @IsString()
  readonly order?: 'asc' | 'desc' = 'asc';
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  readonly _start?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  readonly _end?: number;

  @IsOptional()
  @IsString()
  readonly _sort?: string = "";

  @IsOptional()
  @IsString()
  readonly _order?: string = "";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  readonly page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  readonly limit?: number = 10;

  // Para refinedev
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  readonly current?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  readonly pageSize?: number = 10;
  
  [key: string]: any;

  // Array de sorters
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SorterDto)
  @Transform(({ value }) => {
    // Si viene como objeto con índices (sorters[0], sorters[1]), convertir a array
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort((a, b) => parseInt(a) - parseInt(b)) // Ordenar por índice
        .map(key => value[key])
        .filter(sorter => sorter && (sorter.field || sorter.field === '')); // Filtrar sorters válidos
    }
    return Array.isArray(value) ? value.filter(sorter => sorter && (sorter.field || sorter.field === '')) : [];
  })
  readonly sorters?: SorterDto[] = [];

  // Array de filtros
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterDto)
  @Transform(({ value }) => {
    // Si viene como objeto con índices (filters[0], filters[1]), convertir a array
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort((a, b) => parseInt(a) - parseInt(b)) // Ordenar por índice
        .map(key => value[key]);
    }
    return value || [];
  })
  readonly filters?: FilterDto[] = [];
}