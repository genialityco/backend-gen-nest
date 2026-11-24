import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Una fila de la carga de asistentes: datos base del miembro + atributos
// dinámicos definidos en el certificado del evento
export class AttendeeRowDto {
  @IsOptional()
  @IsNumber()
  readonly row?: number;

  @IsOptional()
  readonly fullName?: string;

  @IsOptional()
  readonly idNumber?: string;

  @IsOptional()
  readonly email?: string;

  @IsOptional()
  readonly phone?: string;

  @IsOptional()
  @IsObject()
  readonly attributes?: Record<string, any>;
}

export class BulkAttendeesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendeeRowDto)
  readonly rows: AttendeeRowDto[];
}

export class UpdateAttendeeDataDto {
  @IsOptional()
  @IsObject()
  readonly member?: {
    fullName?: string;
    idNumber?: string;
    email?: string;
    phone?: string;
  };

  @IsOptional()
  @IsObject()
  readonly attributes?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  readonly attended?: boolean;
}

// Edición libre de member.properties: `set` cambia o agrega datos y `unset`
// elimina claves (ej. dataTreatmentConsent)
export class UpdateMemberPropertiesDto {
  @IsOptional()
  @IsObject()
  readonly set?: Record<string, string | number | boolean>;

  @IsOptional()
  @IsArray()
  readonly unset?: string[];
}

// Configuración del correo del certificado. La estructura de los bloques se
// valida y sanea en certificate-email.template.ts
export class EmailSettingsBodyDto {
  @IsOptional()
  @IsObject()
  readonly settings?: Record<string, any>;
}

export class EmailRecipientsQueryDto {
  @IsOptional()
  @IsIn(['pending', 'all'])
  readonly scope?: 'pending' | 'all';

  @IsOptional()
  @IsString()
  readonly after?: string;
}

export class CertificateEmailUploadDto {
  @IsMongoId()
  readonly memberId: string;

  @IsOptional()
  @IsIn(['manual', 'auto', 'pending', 'all'])
  readonly mode?: 'manual' | 'auto' | 'pending' | 'all';
}

export class TestEmailUploadDto {
  @IsString()
  readonly to: string;

  @IsOptional()
  @IsString()
  readonly settings?: string;
}

export class CompleteIdNumberDto {
  @IsString()
  @MaxLength(30)
  readonly idNumber: string;
}
