import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'Junior Suite', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'junior-suite', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase with hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Spacious suite with ocean view' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '1 King Bed', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  bed_type?: string;

  @ApiPropertyOptional({ example: '45 sqm', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  room_size?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 10 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  max_adults?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  max_children?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  max_occupancy?: number;

  @ApiPropertyOptional({ example: 299.99 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  base_price?: number;

  @ApiPropertyOptional({ example: ['WiFi', 'Ocean View', 'Mini Bar'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiPropertyOptional({ example: 'https://example.com/room.jpg' })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({
    example: ['/uploads/rooms/img1.jpg', '/uploads/rooms/img2.jpg'],
    description: 'Array of room gallery image URLs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery_images?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  sort_order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
