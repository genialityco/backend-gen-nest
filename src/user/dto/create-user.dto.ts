import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  readonly firebaseUid: string;

  @IsString()
  @IsOptional()
  expoPushToken?: string;
}
