import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  readonly description?: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: string;
}
