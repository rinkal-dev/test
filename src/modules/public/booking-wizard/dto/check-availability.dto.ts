/**
 * ============================================
 * CHECK AVAILABILITY DTO
 * ============================================
 *
 * DTOs for date availability check in the booking wizard.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CheckDateAvailabilityDto {
  @ApiProperty({
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsDateString()
  check_in: string;

  @ApiProperty({
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2026-03-05',
  })
  @IsDateString()
  check_out: string;
}

export class DateAvailabilityResponse {
  @ApiProperty({ description: 'Whether the dates are available for booking' })
  is_available: boolean;

  @ApiProperty({
    description: 'Booking window dates',
    example: { start: '2026-02-01', end: '2026-03-15' },
  })
  booking_window: {
    start: string;
    end: string;
  };

  @ApiProperty({
    description: 'Wedding event dates',
    example: { start: '2026-03-10', end: '2026-03-12' },
  })
  event_dates: {
    start: string;
    end: string;
  };

  @ApiProperty({
    description: 'Allowed stay dates for guests',
    example: { earliest_check_in: '2026-03-03', latest_check_in: '2026-03-10', earliest_check_out: '2026-03-11', latest_check_out: '2026-03-12' },
  })
  stay_dates: {
    earliest_check_in: string;
    latest_check_in: string;
    earliest_check_out: string;
    latest_check_out: string;
  };

  @ApiProperty({
    description: 'Requested date details',
    example: { check_in: '2026-03-01', check_out: '2026-03-05', nights: 4 },
  })
  requested_dates: {
    check_in: string;
    check_out: string;
    nights: number;
  };

  @ApiProperty({
    description: 'Validation results',
  })
  validation: {
    booking_is_open: boolean;
    check_in_valid: boolean;
    check_out_valid: boolean;
    min_nights_met: boolean;
    max_nights_met: boolean;
  };

  @ApiPropertyOptional({
    description: 'Error messages if any validation failed',
  })
  errors?: string[];
}
