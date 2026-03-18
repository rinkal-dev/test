import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FlightQueryDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by wedding group UUID' })
  @IsOptional()
  @IsString()
  group_uuid?: string;

  @ApiPropertyOptional({ description: 'Filter by transfer status', enum: ['pending', 'confirmed', 'not_needed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'not_needed', 'cancelled'])
  transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Filter by arrival date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  arrival_date?: string;

  @ApiPropertyOptional({ description: 'Filter by departure date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  departure_date?: string;

  @ApiPropertyOptional({ description: 'Filter: only guests needing arrival transfer' })
  @IsOptional()
  @Type(() => Boolean)
  needs_arrival_transfer?: boolean;

  @ApiPropertyOptional({ description: 'Filter: only guests needing departure transfer' })
  @IsOptional()
  @Type(() => Boolean)
  needs_departure_transfer?: boolean;

  @ApiPropertyOptional({ description: 'Search by guest name or flight number' })
  @IsOptional()
  @IsString()
  search?: string;
}
