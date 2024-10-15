import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsOptional()
  readonly propertiesDefinition?: any;
}
