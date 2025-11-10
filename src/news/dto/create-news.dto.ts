import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
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
  readonly eventId: Types.ObjectId;

  @IsString()
  @IsOptional()
  readonly featuredImage?: string;

  @IsOptional()
  readonly isPublic?: boolean | true;

    @IsDateString()
    @IsOptional()
    readonly scheduledAt?: Date;
}
