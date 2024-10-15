import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  readonly startTime: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  readonly endTime: Date;

  @IsString()
  @IsOptional()
  readonly moderator?: string;
}
