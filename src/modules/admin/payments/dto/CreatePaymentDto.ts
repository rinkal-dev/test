import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  Min,
} from 'class-validator';

export enum PaymentType {
  DEPOSIT = 'deposit',
  FINAL = 'final',
}

export enum PaymentGateway {
  STRIPE = 'stripe',
  WETRAVEL = 'wetravel',
  MANUAL = 'manual',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export class CreatePaymentDto {
  @ApiProperty({ example: 'uuid-of-booking', description: 'Booking UUID' })
  @IsString()
  @IsNotEmpty()
  booking_uuid: string;

  @ApiProperty({ example: 'deposit', enum: PaymentType })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  payment_type: PaymentType;

  @ApiProperty({ example: 'stripe', enum: PaymentGateway })
  @IsEnum(PaymentGateway)
  @IsNotEmpty()
  payment_gateway: PaymentGateway;

  @ApiProperty({ example: 250.00, description: 'Payment amount' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'USD', description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'txn_123456', description: 'External transaction ID' })
  @IsString()
  @IsOptional()
  transaction_id?: string;

  @ApiPropertyOptional({ example: 'pi_123456', description: 'Stripe Payment Intent ID' })
  @IsString()
  @IsOptional()
  payment_intent_id?: string;

  @ApiPropertyOptional({ example: 'pending', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: object;
}
