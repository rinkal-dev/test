import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by booking UUID',
  })
  @IsOptional()
  @IsString()
  booking_uuid?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice status',
    enum: ['draft', 'issued', 'paid', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['draft', 'issued', 'paid', 'cancelled'])
  status?: 'draft' | 'issued' | 'paid' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Filter by invoice type',
    enum: ['deposit', 'final'],
  })
  @IsOptional()
  @IsEnum(['deposit', 'final'])
  invoice_type?: 'deposit' | 'final';

  @ApiPropertyOptional({
    description: 'Filter by currency',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (created_at)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (created_at)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({
    description: 'Search by invoice number or booking reference',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';
}
