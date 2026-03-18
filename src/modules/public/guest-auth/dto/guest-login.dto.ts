/**
 * ============================================
 * GUEST LOGIN DTOs
 * ============================================
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, Matches, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

// Custom validator for password match
@ValidatorConstraint({ name: 'PasswordMatch', async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const object = args.object as any;
    return object.password === confirmPassword;
  }

  defaultMessage() {
    return 'Passwords do not match';
  }
}

// Password complexity regex: at least 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const PASSWORD_MESSAGE = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';

/**
 * Login with email and booking reference
 */
export class GuestLoginDto {
  @ApiProperty({
    description: 'Guest email address',
    example: 'guest@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Booking reference number',
    example: 'BK-2026-001234',
  })
  @IsString()
  @IsNotEmpty()
  booking_reference: string;
}

/**
 * Login with access token (from invitation link)
 */
export class GuestTokenLoginDto {
  @ApiProperty({
    description: 'Guest access token from invitation link',
    example: 'abc123xyz789',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

/**
 * Guest login response
 */
export class GuestLoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  token_type: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 86400,
  })
  expires_in: number;

  @ApiProperty({
    description: 'Guest profile information',
  })
  guest: {
    uuid: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    wedding: {
      uuid: string;
      name: string;
      booking_link: string;
    };
  };
}

/**
 * Guest profile response
 */
export class GuestProfileResponseDto {
  @ApiProperty({ description: 'Guest UUID' })
  uuid: string;

  @ApiProperty({ description: 'Guest name' })
  name: string;

  @ApiProperty({ description: 'Guest email' })
  email: string;

  @ApiPropertyOptional({ description: 'Guest phone' })
  phone: string | null;

  @ApiProperty({ description: 'Relationship to couple' })
  relationship: string | null;

  @ApiProperty({ description: 'Side (bride/groom/mutual)' })
  side: string | null;

  @ApiProperty({ description: 'Plus ones allowed' })
  plus_ones_allowed: number;

  @ApiProperty({ description: 'Guest status' })
  status: string;

  @ApiProperty({ description: 'Wedding information' })
  wedding: {
    uuid: string;
    name: string;
    booking_link: string;
    event_start_date: string;
    event_end_date: string;
    hotel: {
      uuid: string;
      name: string;
      city: string;
      country: string;
    } | null;
  };

  @ApiPropertyOptional({ description: 'Active bookings' })
  bookings: Array<{
    uuid: string;
    booking_reference: string;
    check_in_date: string;
    check_out_date: string;
    total_rooms: number;
    total_amount: number;
    status: string;
  }>;
}

// ============================================
// PASSWORD-BASED AUTHENTICATION DTOs
// ============================================

/**
 * Login with email and password
 */
export class GuestPasswordLoginDto {
  @ApiProperty({
    description: 'Guest email address',
    example: 'guest@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Guest password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  password: string;
}

/**
 * Set password during booking (with guest UUID)
 */
export class SetPasswordByUuidDto {
  @ApiProperty({
    description: 'Guest UUID',
    example: 'abc123-def456-ghi789',
  })
  @IsString()
  @IsNotEmpty({ message: 'Guest UUID is required' })
  guest_uuid: string;

  @ApiProperty({
    description: 'New password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({
    description: 'Confirm password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  @Validate(PasswordMatchConstraint)
  confirm_password: string;
}

/**
 * Set password via email token link
 */
export class SetPasswordByTokenDto {
  @ApiProperty({
    description: 'Set password token from email',
    example: 'abc123xyz789...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  @MinLength(32, { message: 'Invalid token format' })
  @MaxLength(128, { message: 'Invalid token format' })
  token: string;

  @ApiProperty({
    description: 'Guest email address',
    example: 'guest@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'New password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({
    description: 'Confirm password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  @Validate(PasswordMatchConstraint)
  confirm_password: string;
}

/**
 * Forgot password request
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Guest email address',
    example: 'guest@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

/**
 * Reset password with token
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123xyz789...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  @MinLength(32, { message: 'Invalid token format' })
  @MaxLength(128, { message: 'Invalid token format' })
  token: string;

  @ApiProperty({
    description: 'Guest email address',
    example: 'guest@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'New password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({
    description: 'Confirm password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  @Validate(PasswordMatchConstraint)
  confirm_password: string;
}
