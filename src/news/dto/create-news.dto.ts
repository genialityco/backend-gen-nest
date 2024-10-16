import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly content: string;

  @IsNotEmpty()
  readonly organizationId: Types.ObjectId;

  @IsString()
  @IsOptional()
  readonly featuredImage?: string;
}
