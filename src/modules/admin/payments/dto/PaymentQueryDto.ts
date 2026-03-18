import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaymentStatus, PaymentType, PaymentGateway } from './CreatePaymentDto';

export class PaymentQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'search term', description: 'Search by booking reference or transaction ID' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-of-booking', description: 'Filter by booking UUID' })
  @IsString()
  @IsOptional()
  booking_uuid?: string;

  @ApiPropertyOptional({ example: 'uuid-of-wedding-group', description: 'Filter by wedding group UUID' })
  @IsString()
  @IsOptional()
  wedding_group_uuid?: string;

  @ApiPropertyOptional({ example: 'deposit', enum: PaymentType })
  @IsEnum(PaymentType)
  @IsOptional()
  payment_type?: PaymentType;

  @ApiPropertyOptional({ example: 'stripe', enum: PaymentGateway })
  @IsEnum(PaymentGateway)
  @IsOptional()
  payment_gateway?: PaymentGateway;

  @ApiPropertyOptional({ example: 'success', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Filter payments from this date' })
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Filter payments until this date' })
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
