/**
 * ============================================
 * CREATE BOOKING DTOs
 * ============================================
 *
 * DTOs for public booking creation via booking wizard.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Room selection for booking
 */
export class RoomSelectionDto {
  @ApiProperty({
    description: 'Room block UUID',
    example: 'uuid-of-room-block',
  })
  @IsString()
  @IsNotEmpty()
  block_uuid: string;

  @ApiProperty({
    description: 'Number of rooms to book',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}

/**
 * Addon selection for booking
 */
export class AddonSelectionDto {
  @ApiProperty({
    description: 'Addon UUID',
    example: 'uuid-of-addon',
  })
  @IsString()
  @IsNotEmpty()
  addon_uuid: string;

  @ApiProperty({
    description: 'Quantity of addon',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}

/**
 * Guest details for booking
 */
export class GuestDetailsDto {
  @ApiProperty({
    description: 'Guest full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Guest email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Guest phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Relationship to couple',
    example: 'friend',
    enum: ['family', 'friend', 'colleague', 'other'],
  })
  @IsString()
  @IsOptional()
  relationship?: string;

  @ApiPropertyOptional({
    description: 'Side (bride/groom/mutual)',
    example: 'bride',
    enum: ['bride', 'groom', 'mutual'],
  })
  @IsString()
  @IsOptional()
  side?: string;

  @ApiPropertyOptional({
    description: 'Optional password for guest account (enables email+password login)',
    example: 'SecurePass123',
  })
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;
}

/**
 * Create booking request DTO
 */
export class CreatePublicBookingDto {
  @ApiProperty({
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsString()
  @IsNotEmpty()
  check_in: string;

  @ApiProperty({
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2026-03-05',
  })
  @IsString()
  @IsNotEmpty()
  check_out: string;

  @ApiProperty({
    description: 'Primary guest details',
    type: GuestDetailsDto,
  })
  @ValidateNested()
  @Type(() => GuestDetailsDto)
  guest: GuestDetailsDto;

  @ApiProperty({
    description: 'Room selections',
    type: [RoomSelectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomSelectionDto)
  rooms: RoomSelectionDto[];

  @ApiPropertyOptional({
    description: 'Addon selections',
    type: [AddonSelectionDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddonSelectionDto)
  addons?: AddonSelectionDto[];

  @ApiProperty({
    description: 'Total number of adults',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  total_adults: number;

  @ApiPropertyOptional({
    description: 'Total number of children',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  total_children?: number;

  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Late check-in requested',
  })
  @IsString()
  @IsOptional()
  special_requests?: string;

  @ApiPropertyOptional({
    description: 'Stripe Payment Intent ID (if paying by card)',
    example: 'pi_xxx',
  })
  @IsString()
  @IsOptional()
  payment_intent_id?: string;

  @ApiPropertyOptional({
    description: 'Guest timezone (IANA format, auto-captured from browser)',
    example: 'Asia/Kolkata',
  })
  @IsString()
  @IsOptional()
  guest_timezone?: string;

  @ApiPropertyOptional({
    description: 'Opt-in to solo traveler connection (roommate matching)',
    example: false,
  })
  @IsOptional()
  roommate_opt_in?: boolean;

  @ApiPropertyOptional({
    description: 'Optional note for roommate matching preferences',
    example: 'Looking for someone to share a room and split costs',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Roommate note must not exceed 500 characters' })
  roommate_note?: string;

  @ApiPropertyOptional({
    description: 'Guest session ID for inventory hold conversion (BW-027/BW-028)',
    example: 'session_abc123xyz',
  })
  @IsString()
  @IsOptional()
  guest_session_id?: string;
}

/**
 * Booking creation response
 */
export class BookingCreatedResponseDto {
  @ApiProperty({ description: 'Booking UUID' })
  booking_uuid: string;

  @ApiProperty({ description: 'Booking reference number' })
  booking_reference: string;

  @ApiProperty({ description: 'Guest UUID' })
  guest_uuid: string;

  @ApiProperty({ description: 'Guest access token for portal login' })
  guest_access_token: string;

  @ApiProperty({ description: 'Booking status' })
  status: string;

  @ApiProperty({ description: 'Check-in date' })
  check_in: string;

  @ApiProperty({ description: 'Check-out date' })
  check_out: string;

  @ApiProperty({ description: 'Total amount' })
  total_amount: number;

  @ApiProperty({ description: 'Deposit amount' })
  deposit_amount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;
}
