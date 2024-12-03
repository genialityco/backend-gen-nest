import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateHighlightDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly organizationId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  readonly eventId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @IsString()
  @IsNotEmpty()
  readonly imageUrl: string;

  @IsString()
  @IsNotEmpty()
  readonly vimeoUrl: string;

  @IsString()
  @IsNotEmpty()
  readonly transcription: string;
}
