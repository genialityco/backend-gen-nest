import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsObject,
  IsDate,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly organizationId?: string;


  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  readonly startDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  readonly endDate: Date;

  @IsObject()
  @IsOptional()
  readonly location?: {
    address?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };

  @IsObject()
  @IsOptional()
  readonly styles?: Record<string, any>;

  @IsObject()
  @IsOptional()
  readonly eventSections?: Record<string, boolean>;

  @IsOptional()
  readonly price?: number;
  
  @IsOptional()
  readonly isExternalRegistration?: boolean;

  @IsOptional()
  readonly externalRegistrationUrl?: string;
}
