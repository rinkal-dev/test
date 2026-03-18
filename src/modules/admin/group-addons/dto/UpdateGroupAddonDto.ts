import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { AddonType, PricingType, AppliesTo } from './CreateGroupAddonDto';

export class UpdateGroupAddonDto {
  @ApiPropertyOptional({
    example: 'breakfast',
    enum: AddonType,
    description: 'Type of addon'
  })
  @IsEnum(AddonType)
  @IsOptional()
  addon_type?: AddonType;

  @ApiPropertyOptional({
    example: 'Full Breakfast Buffet',
    maxLength: 255
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'Includes hot and cold items, fresh juices, and coffee'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 30.00 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 'per_stay',
    enum: PricingType,
    description: 'How the price is calculated: per_stay (flat fee), per_night, per_guest, or per_guest_per_night'
  })
  @IsEnum(PricingType)
  @IsOptional()
  pricing_type?: PricingType;

  @ApiPropertyOptional({
    example: 'all_guests',
    enum: AppliesTo,
    description: 'Which guests are counted for per_guest pricing: all_guests (adults + children), adults_only, or children_only'
  })
  @IsEnum(AppliesTo)
  @IsOptional()
  applies_to?: AppliesTo;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum quantity allowed per booking'
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(99)
  max_quantity?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
