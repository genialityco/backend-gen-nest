import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationTemplateDto {
  @IsMongoId()
  @IsNotEmpty()
  readonly organizationId: string;

  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly body: string;

  @IsObject()
  @IsOptional()
  readonly data?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  readonly isSent?: boolean;

  @IsOptional()
  @IsNumber()
  readonly totalSent?: number;

  @IsOptional()
  @IsDateString()
  readonly sentAt?: Date;
}
