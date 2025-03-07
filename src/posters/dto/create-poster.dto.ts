import { IsNotEmpty, IsString, IsArray, IsUrl, IsOptional } from 'class-validator';

export class CreatePosterDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly category: string;

  @IsString()
  @IsOptional()
  readonly topic: string;

  @IsString()
  @IsOptional()
  readonly institution: string;

  @IsArray()
  @IsNotEmpty()
  readonly authors: string[];

  @IsOptional()
  readonly votes?: number;

  @IsUrl()
  @IsNotEmpty()
  readonly urlPdf: string;

  @IsOptional()
  readonly eventId?: string;
}
