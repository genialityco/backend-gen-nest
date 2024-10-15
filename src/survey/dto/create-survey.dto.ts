import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuestionDto {
  @IsString()
  @IsNotEmpty()
  readonly type: 'radio' | 'text' | 'checkbox';

  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsArray()
  @IsOptional()
  readonly options?: string[];
}

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsArray()
  @Type(() => QuestionDto)
  readonly questions: QuestionDto[];

  @IsBoolean()
  @IsNotEmpty()
  readonly isPublished: boolean;

  @IsBoolean()
  @IsNotEmpty()
  readonly isOpen: boolean;

  @IsNotEmpty()
  @IsMongoId()
  readonly organizationId: string;

  @IsOptional()
  @IsMongoId()
  readonly eventId?: string;
}
