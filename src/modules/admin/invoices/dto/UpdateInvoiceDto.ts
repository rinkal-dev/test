import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Invoice status',
    enum: ['draft', 'issued', 'paid', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['draft', 'issued', 'paid', 'cancelled'])
  status?: 'draft' | 'issued' | 'paid' | 'cancelled';

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
    description: 'PDF URL after generation',
  })
  @IsOptional()
  @IsString()
  pdf_url?: string;
}

export class UpdateInvoiceStatusDto {
  @ApiPropertyOptional({
    description: 'Invoice status',
    enum: ['draft', 'issued', 'paid', 'cancelled'],
    example: 'issued',
  })
  @IsEnum(['draft', 'issued', 'paid', 'cancelled'])
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
}

export class MarkInvoicePaidDto {
  @ApiPropertyOptional({
    description: 'Payment UUID to link',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsString()
  payment_uuid?: string;
}
