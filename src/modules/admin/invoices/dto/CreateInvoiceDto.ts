import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Booking UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  booking_uuid: string;

  @ApiProperty({
    description: 'Invoice type',
    enum: ['deposit', 'final'],
    example: 'deposit',
  })
  @IsNotEmpty()
  @IsEnum(['deposit', 'final'])
  invoice_type: 'deposit' | 'final';

  @ApiProperty({
    description: 'Subtotal amount (before tax)',
    example: 1000.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({
    description: 'Tax amount',
    example: 150.0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_amount?: number;

  @ApiProperty({
    description: 'Total invoice amount',
    example: 1150.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Due date for payment',
    example: '2026-02-15',
  })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({
    description: 'Invoice notes or terms',
    example: 'Payment due within 30 days',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Initial status',
    enum: ['draft', 'issued'],
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(['draft', 'issued'])
  status?: 'draft' | 'issued';
}

export class GenerateInvoiceForBookingDto {
  @ApiProperty({
    description: 'Invoice type to generate',
    enum: ['deposit', 'final'],
    example: 'deposit',
  })
  @IsNotEmpty()
  @IsEnum(['deposit', 'final'])
  invoice_type: 'deposit' | 'final';

  @ApiPropertyOptional({
    description: 'Due date for payment',
    example: '2026-02-15',
  })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({
    description: 'Invoice notes or terms',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Automatically issue the invoice',
    default: true,
  })
  @IsOptional()
  auto_issue?: boolean;
}
