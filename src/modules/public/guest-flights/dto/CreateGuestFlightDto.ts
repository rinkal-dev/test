import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuestFlightDto {
  // Arrival Flight Details
  @ApiPropertyOptional({ example: 'American Airlines', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  arrival_airline?: string;

  @ApiPropertyOptional({ example: 'AA123', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  arrival_flight_number?: string;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  arrival_date?: string;

  @ApiPropertyOptional({ example: '14:30', description: 'Time in HH:MM or HH:MM:SS format' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'arrival_time must be in HH:MM or HH:MM:SS format',
  })
  arrival_time?: string;

  @ApiPropertyOptional({ example: 'CUN - Cancun International', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  arrival_airport?: string;

  @ApiPropertyOptional({ example: 'Terminal 3', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  arrival_terminal?: string;

  // Departure Flight Details
  @ApiPropertyOptional({ example: 'United Airlines', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departure_airline?: string;

  @ApiPropertyOptional({ example: 'UA456', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  departure_flight_number?: string;

  @ApiPropertyOptional({ example: '2026-03-20' })
  @IsOptional()
  @IsDateString()
  departure_date?: string;

  @ApiPropertyOptional({ example: '10:00', description: 'Time in HH:MM or HH:MM:SS format' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'departure_time must be in HH:MM or HH:MM:SS format',
  })
  departure_time?: string;

  @ApiPropertyOptional({ example: 'CUN - Cancun International', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departure_airport?: string;

  @ApiPropertyOptional({ example: 'Terminal 2', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  departure_terminal?: string;

  // Transfer Requirements
  @ApiPropertyOptional({ example: true, description: 'Whether guest needs airport transfer on arrival' })
  @IsOptional()
  @IsBoolean()
  needs_arrival_transfer?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether guest needs airport transfer on departure' })
  @IsOptional()
  @IsBoolean()
  needs_departure_transfer?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'Number of passengers needing transfer', minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  passengers_count?: number;

  @ApiPropertyOptional({ example: 'We have 2 large suitcases and a stroller', description: 'Additional notes for transfer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  transfer_notes?: string;
}
