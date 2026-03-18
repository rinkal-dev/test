import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
}

export enum RefundGateway {
  STRIPE = 'stripe',
  WETRAVEL = 'wetravel',
  MANUAL = 'manual',
}

export class CreateRefundDto {
  @ApiProperty({ description: 'Payment UUID to refund' })
  @IsUUID()
  payment_uuid: string;

  @ApiProperty({
    description: 'Refund type',
    enum: RefundType,
  })
  @IsEnum(RefundType)
  refund_type: RefundType;

  @ApiPropertyOptional({
    description: 'Refund amount (required for partial refunds)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/**
 * DTO for creating a refund at the booking level (total paid amount)
 */
export class CreateBookingRefundDto {
  @ApiProperty({ description: 'Booking UUID to refund' })
  @IsUUID()
  booking_uuid: string;

  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
