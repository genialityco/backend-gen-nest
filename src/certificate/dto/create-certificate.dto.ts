import { IsMongoId, IsNotEmpty, IsArray } from 'class-validator';

export class CreateCertificateDto {
  @IsArray()
  @IsNotEmpty()
  readonly elements: Record<string, any>[];

  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;
}
