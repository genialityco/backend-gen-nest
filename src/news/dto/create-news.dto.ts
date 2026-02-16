import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  organizationId: Types.ObjectId;

  @IsString()
  @IsOptional()
  eventId: Types.ObjectId;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsOptional()
  isPublic?: boolean;

  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;

  @IsDateString()
  @IsOptional()
  publishedAt?: Date;
}
