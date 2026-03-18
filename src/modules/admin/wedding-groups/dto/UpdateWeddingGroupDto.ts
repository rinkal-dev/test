import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DepositType, WeddingGroupStatus } from './CreateWeddingGroupDto';

export class UpdateWeddingGroupDto {
  @ApiPropertyOptional({ example: 'Smith & Johnson Wedding', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({ example: 'Emily Smith', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Bride name must not exceed 255 characters' })
  bride_name?: string;

  @ApiPropertyOptional({ example: 'Michael Johnson', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Groom name must not exceed 255 characters' })
  groom_name?: string;

  @ApiPropertyOptional({ example: '2026-06-15', description: 'Event start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  event_start_date?: string;

  @ApiPropertyOptional({ example: '2026-06-17', description: 'Event end date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  event_end_date?: string;

  @ApiPropertyOptional({ example: '2026-03-01', description: 'Booking window start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  booking_window_start?: string;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Booking window end date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  booking_window_end?: string;

  @ApiPropertyOptional({ example: 'abc123-uuid', description: 'Hotel UUID for the wedding event' })
  @IsString()
  @IsOptional()
  hotel_uuid?: string;

  @ApiPropertyOptional({ example: 'percentage', enum: DepositType, description: 'Type of deposit: fixed (flat amount), percentage (% of total), or per_person (amount × number of guests)' })
  @IsEnum(DepositType)
  @IsOptional()
  deposit_type?: DepositType;

  @ApiPropertyOptional({ example: 25, description: 'Deposit value: flat amount (if fixed), percentage (if percentage), or per-person amount (if per_person)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  deposit_value?: number;

  @ApiPropertyOptional({ example: 30, description: 'Days before event when final payment is due' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  final_payment_due_days?: number;

  @ApiPropertyOptional({ example: 'Sarah Smith', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Contact name must not exceed 255 characters' })
  contact_name?: string;

  @ApiPropertyOptional({ example: 'sarah.smith@email.com', maxLength: 255 })
  @IsEmail()
  @IsOptional()
  @MaxLength(255, { message: 'Contact email must not exceed 255 characters' })
  contact_email?: string;

  @ApiPropertyOptional({ example: '+1 555 123 4567', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Contact phone must not exceed 20 characters' })
  contact_phone?: string;

  // Bride contact info
  @ApiPropertyOptional({ example: 'emily@email.com', maxLength: 255, description: 'Bride email address' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255, { message: 'Bride email must not exceed 255 characters' })
  bride_email?: string;

  @ApiPropertyOptional({ example: '+1 555 111 2222', maxLength: 20, description: 'Bride phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Bride phone must not exceed 20 characters' })
  bride_phone?: string;

  // Groom contact info
  @ApiPropertyOptional({ example: 'michael@email.com', maxLength: 255, description: 'Groom email address' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255, { message: 'Groom email must not exceed 255 characters' })
  groom_email?: string;

  @ApiPropertyOptional({ example: '+1 555 333 4444', maxLength: 20, description: 'Groom phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Groom phone must not exceed 20 characters' })
  groom_phone?: string;

  // Hotel contact info
  @ApiPropertyOptional({ example: 'John Resort Manager', maxLength: 255, description: 'Hotel contact person name' })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Hotel contact name must not exceed 255 characters' })
  hotel_contact_name?: string;

  @ApiPropertyOptional({ example: 'reservations@hotel.com', maxLength: 255, description: 'Hotel contact email' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255, { message: 'Hotel contact email must not exceed 255 characters' })
  hotel_contact_email?: string;

  @ApiPropertyOptional({ example: '+1 555 555 5555', maxLength: 20, description: 'Hotel contact phone' })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Hotel contact phone must not exceed 20 characters' })
  hotel_contact_phone?: string;

  // Admin notes and external reference
  @ApiPropertyOptional({ example: 'VIP client, special room requests noted.', description: 'Internal admin notes (not visible to guests)' })
  @IsString()
  @IsOptional()
  admin_notes?: string;

  @ApiPropertyOptional({ example: 'HTL-2026-12345', maxLength: 100, description: 'External booking reference from hotel' })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'External booking ref must not exceed 100 characters' })
  external_booking_ref?: string;

  @ApiPropertyOptional({ example: true, description: 'Enable WhatsApp notifications' })
  @IsBoolean()
  @IsOptional()
  whatsapp_enabled?: boolean;

  @ApiPropertyOptional({ example: 'active', enum: WeddingGroupStatus })
  @IsEnum(WeddingGroupStatus)
  @IsOptional()
  status?: WeddingGroupStatus;

  @ApiPropertyOptional({ example: 'Welcome to our wedding! We are so excited to celebrate with you.', description: 'Welcome message shown on public booking page' })
  @IsString()
  @IsOptional()
  welcome_message?: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/wedding-hero.jpg', maxLength: 500, description: 'Hero image URL for public booking page' })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Image URL must not exceed 500 characters' })
  image_url?: string;

  @ApiPropertyOptional({
    example: 'America/Cancun',
    maxLength: 50,
    description: 'IANA timezone for the event/hotel location (e.g., America/New_York, Europe/Paris, Asia/Kolkata). All booking times will be displayed in this timezone.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  timezone?: string;

  @ApiPropertyOptional({
    example: 15.00,
    description: 'Tax rate percentage applied to bookings (e.g., 15.00 = 15%).',
  })
  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Tax rate cannot be negative' })
  @Max(100, { message: 'Tax rate cannot exceed 100%' })
  tax_rate?: number;

  @ApiPropertyOptional({
    example: 'CAD',
    description: 'ISO 4217 currency code. Cannot be changed if bookings exist.',
  })
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Currency code must be exactly 3 characters' })
  @MaxLength(3, { message: 'Currency code must be exactly 3 characters' })
  currency_code?: string;
}
