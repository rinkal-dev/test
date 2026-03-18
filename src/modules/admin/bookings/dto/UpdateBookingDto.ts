import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { BookingStatus } from './CreateBookingDto';

export class UpdateBookingDto {
  @ApiPropertyOptional({ example: '2026-06-15', description: 'Check-in date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  check_in_date?: string;

  @ApiPropertyOptional({ example: '2026-06-17', description: 'Check-out date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  check_out_date?: string;

  @ApiPropertyOptional({ example: 2, description: 'Total number of adults' })
  @IsInt()
  @Min(1)
  @IsOptional()
  total_adults?: number;

  @ApiPropertyOptional({ example: 0, description: 'Total number of children' })
  @IsInt()
  @Min(0)
  @IsOptional()
  total_children?: number;

  @ApiPropertyOptional({ example: 'Late check-in requested', description: 'Special requests' })
  @IsString()
  @IsOptional()
  special_requests?: string;

  @ApiPropertyOptional({ example: 'confirmed', enum: BookingStatus })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({ example: 'Guest requested cancellation', description: 'Cancellation reason' })
  @IsString()
  @IsOptional()
  cancellation_reason?: string;
}
