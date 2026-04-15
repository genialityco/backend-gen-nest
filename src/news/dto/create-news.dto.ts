import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

// Validador custom para verificar que scheduledAt sea fecha futura
@ValidatorConstraint({ name: 'IsFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) return true; // Si es null/undefined, ValidationPipe lo filtra
    const date = new Date(value);
    return date > new Date(); // Debe ser mayor a ahora
  }

  defaultMessage(args: ValidationArguments) {
    return 'scheduledAt debe ser una fecha futura';
  }
}

export function IsFutureDate() {
  return function (target: any, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

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

  @IsOptional()
  @Type(() => Date)
  @ValidateIf((obj) => obj.scheduledAt !== null && obj.scheduledAt !== undefined)
  @IsFutureDate()
  scheduledAt?: Date;

  @IsOptional()
  @Type(() => Date)
  publishedAt?: Date;
}
