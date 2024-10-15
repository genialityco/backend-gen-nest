import { IsMongoId, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateMemberDto {
  @IsMongoId()
  @IsNotEmpty()
  readonly userId: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly organizationId: string;

  @IsObject()
  @IsOptional()
  readonly properties?: Record<string, any>;
}
