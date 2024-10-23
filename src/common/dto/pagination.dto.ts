import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
 

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  readonly _start;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  readonly _end;

  @IsOptional()
  @Type(() => String)
  @IsNumber()
  @Min(0)
  readonly _sort ="";

  @IsOptional()
  @Type(() => String)
  @IsNumber()
  @Min(0)
  readonly _order ="";

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

}
