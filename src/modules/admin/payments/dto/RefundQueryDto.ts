import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RefundQueryDto {
  @ApiPropertyOptional({ description: 'Filter by booking UUID' })
  @IsOptional()
  @IsUUID()
  booking_uuid?: string;

  @ApiPropertyOptional({ description: 'Filter by payment UUID' })
  @IsOptional()
  @IsUUID()
  payment_uuid?: string;

  @ApiPropertyOptional({ description: 'Filter by wedding group UUID' })
  @IsOptional()
  @IsUUID()
  wedding_group_uuid?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'approved', 'denied', 'processing', 'processed', 'failed'],
  })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'denied', 'processing', 'processed', 'failed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by refund type',
    enum: ['full', 'partial'],
  })
  @IsOptional()
  @IsEnum(['full', 'partial'])
  refund_type?: string;

  @ApiPropertyOptional({
    description: 'Filter by gateway',
    enum: ['stripe', 'wetravel', 'manual'],
  })
  @IsOptional()
  @IsEnum(['stripe', 'wetravel', 'manual'])
  refund_gateway?: string;

  @ApiPropertyOptional({ description: 'Search by booking reference or reason' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;

  @ApiPropertyOptional({
    description: 'Sort field',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
