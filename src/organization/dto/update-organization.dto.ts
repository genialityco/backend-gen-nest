import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  propertiesDefinition?: any[];
}
