import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { PaymentStatus } from './CreatePaymentDto';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ example: 'txn_123456', description: 'External transaction ID' })
  @IsString()
  @IsOptional()
  transaction_id?: string;

  @ApiPropertyOptional({ example: 'pi_123456', description: 'Stripe Payment Intent ID' })
  @IsString()
  @IsOptional()
  payment_intent_id?: string;

  @ApiPropertyOptional({ example: 'success', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: 'Card declined', description: 'Failure reason if failed' })
  @IsString()
  @IsOptional()
  failure_reason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: object;
}
