import {
  IsNotEmpty,
  IsArray,
  IsString,
  IsOptional,
  IsMongoId,
  IsISO8601,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateAgendaDto {
  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;

  @IsArray()
  @ArrayNotEmpty()
  readonly sessions: SessionDto[];
}

export class SessionDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsISO8601()
  @IsNotEmpty()
  readonly startDateTime: string;

  @IsISO8601()
  @IsNotEmpty()
  readonly endDateTime: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  readonly speakers: string[];

  @IsOptional()
  @IsMongoId()
  readonly module?: string;

  @IsOptional()
  @IsString()
  readonly room?: string;
}
