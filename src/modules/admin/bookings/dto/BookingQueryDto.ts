import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from './CreateBookingDto';

export class BookingQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'search term', description: 'Search by booking reference, guest name, or email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-of-wedding-group', description: 'Filter by wedding group UUID' })
  @IsString()
  @IsOptional()
  wedding_group_uuid?: string;

  @ApiPropertyOptional({ example: 'pending', enum: BookingStatus, description: 'Filter by status' })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Filter bookings from this date' })
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Filter bookings until this date' })
  @IsDateString()
  @IsOptional()
  date_to?: string;

  @ApiPropertyOptional({ example: 'created_at', description: 'Sort field' })
  @IsString()
  @IsOptional()
  sort_by?: string;

  @ApiPropertyOptional({ example: 'DESC', description: 'Sort direction' })
  @IsString()
  @IsOptional()
  sort_order?: 'ASC' | 'DESC';
}
