import { IsMongoId, IsNotEmpty, IsObject } from 'class-validator';

export class CreateCertificateDto {
  @IsObject()
  @IsNotEmpty()
  readonly elements: Record<string, any>;

  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;
}
