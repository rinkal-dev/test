import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsInt,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateGuestDto {
  @ApiProperty({ description: 'Wedding group UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: 'Invalid wedding group ID format' })
  @IsNotEmpty({ message: 'Wedding group is required' })
  wedding_group_uuid: string;

  @ApiProperty({ description: 'Guest full name', example: 'John Smith', maxLength: 255 })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Guest name is required' })
  @MaxLength(255, { message: 'Guest name must not exceed 255 characters' })
  name: string;

  @ApiProperty({ description: 'Guest email address', example: 'john@example.com', maxLength: 255 })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiPropertyOptional({ description: 'Guest phone number', example: '+1 234 567 8900', maxLength: 20 })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Relationship to couple',
    enum: ['family', 'friend', 'colleague', 'other'],
    example: 'family',
  })
  @IsOptional()
  @IsEnum(['family', 'friend', 'colleague', 'other'], {
    message: 'Relationship must be one of: family, friend, colleague, other',
  })
  relationship?: string;

  @ApiPropertyOptional({
    description: 'Which side of the couple',
    enum: ['bride', 'groom', 'mutual'],
    example: 'bride',
  })
  @IsOptional()
  @IsEnum(['bride', 'groom', 'mutual'], {
    message: 'Side must be one of: bride, groom, mutual',
  })
  side?: string;

  @ApiPropertyOptional({
    description: 'Number of plus-ones allowed',
    default: 0,
    minimum: 0,
    maximum: 10,
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Plus ones must be a whole number' })
  @Min(0, { message: 'Plus ones cannot be negative' })
  @Max(10, { message: 'Plus ones cannot exceed 10' })
  plus_ones_allowed?: number;

  @ApiPropertyOptional({
    description: 'Preferred invitation channel',
    enum: ['email', 'whatsapp', 'both'],
    default: 'email',
    example: 'email',
  })
  @IsOptional()
  @IsEnum(['email', 'whatsapp', 'both'], {
    message: 'Invitation channel must be one of: email, whatsapp, both',
  })
  invitation_channel?: string;

  @ApiPropertyOptional({ description: 'Admin notes about guest', maxLength: 1000 })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  notes?: string;
}
