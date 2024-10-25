import { IsMongoId, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateAttendeeDto {
  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;

  @IsMongoId()
  @IsOptional()
  readonly userId?: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly memberId: string;

  @IsOptional()
  readonly attended: boolean;
}
