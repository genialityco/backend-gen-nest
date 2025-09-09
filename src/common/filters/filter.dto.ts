import { IsOptional, IsString } from "class-validator";

export class FilterDto {
    @IsString()
    field: string;
  
    @IsOptional()
    @IsString()
    operator?: string = 'eq'; // Por defecto 'eq' (equals)
  
    @IsOptional()
    value?: any;
  }