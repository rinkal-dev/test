import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export enum IconType {
  DRINK = 'drink',
  BEACH = 'beach',
  WEDDING = 'wedding',
  FOOD = 'food',
  RELAX = 'relax',
  OTHER = 'other',
}

export class CreateGroupItineraryDto {
  @ApiProperty({
    example: 'Welcome Cocktails',
    maxLength: 255,
    description: 'Title of the event'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'Join us for welcome drinks and meet the wedding party!',
    description: 'Detailed description of the event'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Date of the event (YYYY-MM-DD)'
  })
  @IsDateString()
  @IsNotEmpty()
  event_date: string;

  @ApiPropertyOptional({
    example: '5:00 PM',
    maxLength: 20,
    description: 'Time of the event in display format'
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  event_time?: string;

  @ApiPropertyOptional({
    example: 'Beach Club Deck',
    maxLength: 255,
    description: 'Location of the event'
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    example: 'drink',
    enum: IconType,
    default: IconType.OTHER,
    description: 'Icon type for the event'
  })
  @IsEnum(IconType)
  @IsOptional()
  icon_type?: IconType;

  @ApiPropertyOptional({
    example: 0,
    description: 'Sort order for display'
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
