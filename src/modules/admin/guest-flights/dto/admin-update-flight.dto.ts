import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min, Max, IsDateString, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for admin to update ALL flight details on behalf of guest.
 * Admin has full edit capability - no time restrictions (FL-LOCK doesn't apply).
 * Validation rules match guest DTO for data consistency.
 */
export class AdminUpdateFlightDto {
  // ===================== ARRIVAL FLIGHT DETAILS =====================
  @ApiPropertyOptional({ description: 'Arrival airline name', example: 'American Airlines' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  arrival_airline?: string;

  @ApiPropertyOptional({ description: 'Arrival flight number', example: 'AA1234' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  arrival_flight_number?: string;

  @ApiPropertyOptional({ description: 'Arrival date (YYYY-MM-DD)', example: '2026-04-15' })
  @IsOptional()
  @IsDateString()
  arrival_date?: string;

  @ApiPropertyOptional({ description: 'Arrival time (HH:MM or HH:MM:SS)', example: '14:30' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'arrival_time must be in HH:MM or HH:MM:SS format',
  })
  arrival_time?: string;

  @ApiPropertyOptional({ description: 'Arrival airport', example: 'CUN - Cancun International' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  arrival_airport?: string;

  @ApiPropertyOptional({ description: 'Arrival terminal', example: 'Terminal 3' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  arrival_terminal?: string;

  // ===================== DEPARTURE FLIGHT DETAILS =====================
  @ApiPropertyOptional({ description: 'Departure airline name', example: 'United Airlines' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departure_airline?: string;

  @ApiPropertyOptional({ description: 'Departure flight number', example: 'UA5678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  departure_flight_number?: string;

  @ApiPropertyOptional({ description: 'Departure date (YYYY-MM-DD)', example: '2026-04-20' })
  @IsOptional()
  @IsDateString()
  departure_date?: string;

  @ApiPropertyOptional({ description: 'Departure time (HH:MM or HH:MM:SS)', example: '10:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'departure_time must be in HH:MM or HH:MM:SS format',
  })
  departure_time?: string;

  @ApiPropertyOptional({ description: 'Departure airport', example: 'CUN - Cancun International' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departure_airport?: string;

  @ApiPropertyOptional({ description: 'Departure terminal', example: 'Terminal 2' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  departure_terminal?: string;

  // ===================== TRANSFER REQUIREMENTS =====================
  @ApiPropertyOptional({ description: 'Does guest need arrival transfer?', example: true })
  @IsOptional()
  @IsBoolean()
  needs_arrival_transfer?: boolean;

  @ApiPropertyOptional({ description: 'Does guest need departure transfer?', example: true })
  @IsOptional()
  @IsBoolean()
  needs_departure_transfer?: boolean;

  @ApiPropertyOptional({ description: 'Number of passengers for transfer', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  passengers_count?: number;

  @ApiPropertyOptional({ description: 'Guest notes about transfer requirements' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  transfer_notes?: string;

  // ===================== TRANSFER STATUS (Admin Only) =====================
  @ApiPropertyOptional({
    description: 'Arrival transfer status',
    enum: ['pending', 'confirmed', 'not_needed', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'not_needed', 'cancelled'])
  arrival_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Departure transfer status',
    enum: ['pending', 'confirmed', 'not_needed', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'not_needed', 'cancelled'])
  departure_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Admin internal notes' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  admin_notes?: string;
}
