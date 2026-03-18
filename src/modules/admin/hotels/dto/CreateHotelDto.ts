import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateHotelDto {
  @ApiProperty({ example: 'Grand Resort & Spa', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Hotel name must not exceed 255 characters' })
  name: string;

  @ApiProperty({ example: 'grand-resort-spa', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Slug must not exceed 255 characters' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase with hyphens only (e.g., grand-resort-spa)',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'A luxurious beachfront resort perfect for destination weddings.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '123 Ocean Drive', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Address must not exceed 255 characters' })
  address: string;

  @ApiProperty({ example: 'Cancun', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city: string;

  @ApiPropertyOptional({ example: 'Quintana Roo', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'State must not exceed 100 characters' })
  state?: string;

  @ApiProperty({ example: 'Mexico', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country: string;

  @ApiPropertyOptional({ example: '77500', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Postal code must not exceed 20 characters' })
  postal_code?: string;

  @ApiPropertyOptional({ example: '+52 998 123 4567', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Phone must not exceed 20 characters' })
  phone?: string;

  @ApiPropertyOptional({ example: 'reservations@grandresort.com', maxLength: 255 })
  @IsEmail()
  @IsOptional()
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://www.grandresort.com', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Website must not exceed 255 characters' })
  website?: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  star_rating?: number;

  @ApiPropertyOptional({ example: '14:00:00', description: 'Check-in time in HH:MM:SS format' })
  @IsString()
  @IsOptional()
  @MaxLength(8, { message: 'Check-in time must not exceed 8 characters' })
  check_in_time?: string;

  @ApiPropertyOptional({ example: '11:00:00', description: 'Check-out time in HH:MM:SS format' })
  @IsString()
  @IsOptional()
  @MaxLength(8, { message: 'Check-out time must not exceed 8 characters' })
  check_out_time?: string;

  @ApiPropertyOptional({ example: 21.1619 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -86.8515 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    example: 'https://example.com/images/hotel.jpg',
    description: 'Primary image URL or base64-encoded image data'
  })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({
    example: ['All-Inclusive', 'Beachfront', 'Luxury Spa'],
    description: 'List of hotel amenities'
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiPropertyOptional({
    example: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    description: 'Array of gallery image URLs or base64-encoded image data'
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery_images?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: 'America/Cancun',
    maxLength: 50,
    description: 'IANA timezone for the hotel location (e.g., America/New_York, Europe/Paris). All booking times will be displayed in this timezone.',
    default: 'UTC'
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  timezone?: string;
}
