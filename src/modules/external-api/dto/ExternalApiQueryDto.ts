import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsNotEmpty } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PaymentDueQueryDto {
  @ApiPropertyOptional({
    description: 'Days until payment due (default: 7)',
    default: 7,
    minimum: 1,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiPropertyOptional({
    description: 'Payment type to filter',
    enum: ['deposit', 'final_payment'],
  })
  @IsOptional()
  @IsIn(['deposit', 'final_payment'])
  payment_type?: string;
}

export class BookingsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'deposit_paid', 'confirmed', 'cancelled', 'completed'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Wedding group UUID' })
  @IsOptional()
  @IsString()
  wedding_uuid?: string;

  @ApiPropertyOptional({ description: 'Check-in date from (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  check_in_from?: string;

  @ApiPropertyOptional({ description: 'Check-in date to (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  check_in_to?: string;
}

export class CheckinReminderQueryDto {
  @ApiPropertyOptional({
    description: 'Days until check-in (default: 7)',
    default: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}

export class LogPaymentReminderDto {
  @ApiProperty({
    description: 'Booking reference (e.g., BK-2026-XXXXXX)',
    example: 'BK-2026-A1B2C3',
  })
  @IsString()
  @IsNotEmpty()
  booking_reference: string;

  @ApiProperty({
    description: 'Reminder type (e.g., 30_days, 14_days, 7_days, 2_days)',
    example: '14_days',
    enum: ['30_days', '14_days', '7_days', '2_days'],
  })
  @IsString()
  @IsIn(['30_days', '14_days', '7_days', '2_days'])
  reminder_type: string;
}
