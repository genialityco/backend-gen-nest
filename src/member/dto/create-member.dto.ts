import { IsBoolean, IsMongoId, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateMemberDto {
  @IsMongoId()
  @IsOptional()
  readonly userId: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  @IsBoolean()
  memberActive: boolean;

  @IsObject()
  @IsOptional()
  readonly properties?: Record<string, any>;
}
