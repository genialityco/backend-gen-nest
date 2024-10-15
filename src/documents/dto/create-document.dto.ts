import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsMongoId,
  IsOptional,
} from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsUrl()
  @IsNotEmpty()
  readonly documentUrl: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;
}
