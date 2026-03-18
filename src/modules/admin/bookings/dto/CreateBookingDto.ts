import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BookingStatus {
  PENDING = 'pending',
  DEPOSIT_PAID = 'deposit_paid',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class BookingRoomDto {
  @ApiProperty({ example: 'uuid-of-room-block', description: 'Room block UUID' })
  @IsString()
  @IsNotEmpty()
  room_block_uuid: string;

  @ApiProperty({ example: 1, description: 'Number of rooms' })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 2, description: 'Number of adults per room' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  adults_per_room?: number;

  @ApiPropertyOptional({ example: 0, description: 'Number of children per room' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  children_per_room?: number;
}

export class BookingAddonDto {
  @ApiProperty({ example: 'uuid-of-addon', description: 'Group addon UUID' })
  @IsString()
  @IsNotEmpty()
  addon_uuid: string;

  @ApiProperty({ example: 2, description: 'Quantity of addon' })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;
}

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-of-wedding-group', description: 'Wedding group UUID' })
  @IsString()
  @IsNotEmpty()
  wedding_group_uuid: string;

  @ApiProperty({ example: 'uuid-of-guest', description: 'Guest UUID' })
  @IsString()
  @IsNotEmpty()
  guest_uuid: string;

  @ApiProperty({ example: '2026-06-15', description: 'Check-in date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  check_in_date: string;

  @ApiProperty({ example: '2026-06-17', description: 'Check-out date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  check_out_date: string;

  @ApiProperty({ type: [BookingRoomDto], description: 'Rooms to book' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingRoomDto)
  rooms: BookingRoomDto[];

  @ApiPropertyOptional({ type: [BookingAddonDto], description: 'Add-ons to include' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BookingAddonDto)
  addons?: BookingAddonDto[];

  @ApiPropertyOptional({ example: 'USD', description: 'Currency code (ISO 4217)' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'Late check-in requested', description: 'Special requests' })
  @IsString()
  @IsOptional()
  special_requests?: string;

  @ApiPropertyOptional({ example: 'pending', enum: BookingStatus })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
