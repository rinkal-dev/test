import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdateGuestDto {
  @ApiPropertyOptional({ description: 'Guest full name', example: 'John Smith', maxLength: 255 })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Guest name must not exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({ description: 'Guest email address', example: 'john@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email?: string;

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

  @ApiPropertyOptional({
    description: 'Guest status',
    enum: ['pending', 'invited', 'booked', 'declined'],
    example: 'invited',
  })
  @IsOptional()
  @IsEnum(['pending', 'invited', 'booked', 'declined'], {
    message: 'Status must be one of: pending, invited, booked, declined',
  })
  status?: string;
}
