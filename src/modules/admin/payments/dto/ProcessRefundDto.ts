import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class ApproveRefundDto {
  @ApiPropertyOptional({ description: 'Admin notes for approval' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class DenyRefundDto {
  @ApiProperty({ description: 'Reason for denial' })
  @IsString()
  @MaxLength(1000)
  denial_reason: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ProcessRefundDto {
  @ApiProperty({
    description: 'Gateway to process refund through',
    enum: ['stripe', 'manual'],
  })
  @IsEnum(['stripe', 'manual'])
  gateway: 'stripe' | 'manual';

  @ApiPropertyOptional({ description: 'Transaction ID for manual refunds' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transaction_id?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
