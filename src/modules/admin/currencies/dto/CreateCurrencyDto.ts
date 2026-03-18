import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'USD', maxLength: 3, description: 'ISO 4217 currency code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  code: string;

  @ApiProperty({ example: 'US Dollar', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '$', maxLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  symbol: string;

  @ApiPropertyOptional({ example: 1.0, description: 'Exchange rate relative to base currency' })
  @IsNumber()
  @IsOptional()
  @Min(0.000001)
  exchange_rate?: number;

  @ApiPropertyOptional({ example: 2, description: 'Number of decimal places (0-3)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(3)
  decimal_places?: number;

  @ApiPropertyOptional({ example: false, description: 'Set as default currency' })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether currency is active for selection' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether Stripe supports this currency' })
  @IsBoolean()
  @IsOptional()
  stripe_supported?: boolean;
}
