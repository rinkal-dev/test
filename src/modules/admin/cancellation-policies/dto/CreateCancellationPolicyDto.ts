import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateCancellationPolicyDto {
  @ApiProperty({
    description: 'Days before the wedding event when this policy applies',
    example: 30,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  days_before_event: number;

  @ApiProperty({
    description: 'Refund percentage (0-100)',
    example: 75,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  refund_percentage: number;

  @ApiPropertyOptional({
    description: 'Description of the policy',
    example: 'Cancel 30+ days before event for 75% refund',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the policy is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
