import { IsString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  readonly firebaseUid: string;

  @IsString()
  expoPushToken?: string;
}
