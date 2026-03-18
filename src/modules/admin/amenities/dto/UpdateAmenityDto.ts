import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAmenityDto {
  @ApiPropertyOptional({ example: 'Free WiFi', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @ApiPropertyOptional({ example: 'wifi', maxLength: 50, description: 'Lucide icon name' })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Icon must not exceed 50 characters' })
  icon?: string;

  @ApiPropertyOptional({ example: 'connectivity', maxLength: 50, description: 'Category for grouping' })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Category must not exceed 50 characters' })
  category?: string;

  @ApiPropertyOptional({ example: 'High-speed wireless internet access', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Sort order for display' })
  @IsNumber()
  @IsOptional()
  sort_order?: number;
}
