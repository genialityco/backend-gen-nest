import { IsNotEmpty, IsString } from 'class-validator';

export class VotePosterDto {
  @IsString()
  @IsNotEmpty()
  readonly userId: string;
}
