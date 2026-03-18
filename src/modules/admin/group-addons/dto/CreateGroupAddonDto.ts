import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export enum AddonType {
  EXTRA_ADULT = 'extra_adult',
  EXTRA_CHILD = 'extra_child',
  EXTRA_BED = 'extra_bed',
  BREAKFAST = 'breakfast',
  AIRPORT_TRANSFER = 'airport_transfer',
  LATE_CHECKOUT = 'late_checkout',
  EARLY_CHECKIN = 'early_checkin',
  OTHER = 'other',
}

export enum PricingType {
  PER_STAY = 'per_stay',
  PER_NIGHT = 'per_night',
  PER_GUEST = 'per_guest',
  PER_GUEST_PER_NIGHT = 'per_guest_per_night',
}

export enum AppliesTo {
  ALL_GUESTS = 'all_guests',
  ADULTS_ONLY = 'adults_only',
  CHILDREN_ONLY = 'children_only',
}

export class CreateGroupAddonDto {
  @ApiProperty({
    example: 'breakfast',
    enum: AddonType,
    description: 'Type of addon'
  })
  @IsEnum(AddonType)
  @IsNotEmpty()
  addon_type: AddonType;

  @ApiPropertyOptional({
    example: 'Full Breakfast Buffet',
    maxLength: 255,
    description: 'Custom name (optional for predefined types)'
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'Includes hot and cold items, fresh juices, and coffee',
    description: 'Detailed description of the addon'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 25.00, description: 'Price of the addon' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 'per_stay',
    enum: PricingType,
    default: 'per_stay',
    description: 'How the price is calculated: per_stay (flat fee), per_night, per_guest, or per_guest_per_night'
  })
  @IsEnum(PricingType)
  @IsOptional()
  pricing_type?: PricingType;

  @ApiPropertyOptional({
    example: 'all_guests',
    enum: AppliesTo,
    default: 'all_guests',
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

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
