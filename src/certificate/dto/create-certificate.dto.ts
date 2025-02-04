import { IsMongoId, IsNotEmpty, IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SizeDto {
  @IsNotEmpty()
  readonly width: number;

  @IsNotEmpty()
  readonly height: number;
}

export class CreateCertificateDto {
  @IsArray()
  @IsNotEmpty()
  readonly elements: Record<string, any>[];

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SizeDto)
  readonly size?: SizeDto;

  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;
}
