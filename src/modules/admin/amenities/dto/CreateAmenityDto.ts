import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAmenityDto {
  @ApiProperty({ example: 'Free WiFi', maxLength: 100 })
  @IsString({ message: 'Amenity name must be a string' })
  @IsNotEmpty({ message: 'Amenity name is required' })
  @MinLength(2, { message: 'Amenity name must be at least 2 characters' })
  @MaxLength(100, { message: 'Amenity name must not exceed 100 characters' })
  name: string;

  @ApiProperty({ example: 'wifi', maxLength: 50, description: 'Lucide icon name' })
  @IsString({ message: 'Icon must be a string' })
  @IsNotEmpty({ message: 'Please select an icon for the amenity' })
  @MaxLength(50, { message: 'Icon name must not exceed 50 characters' })
  icon: string;

  @ApiPropertyOptional({ example: 'connectivity', maxLength: 50, description: 'Category for grouping' })
  @IsString({ message: 'Category must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Category must not exceed 50 characters' })
  category?: string;

  @ApiPropertyOptional({ example: 'High-speed wireless internet access', maxLength: 255 })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean({ message: 'Active status must be true or false' })
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 1, default: 0, description: 'Sort order for display' })
  @IsNumber({}, { message: 'Sort order must be a number' })
  @IsOptional()
  sort_order?: number;
}
