import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class CreateRoomBlockDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Room type UUID from the hotel' })
  @IsString()
  @IsNotEmpty()
  room_type_uuid: string;

  @ApiProperty({ example: 10, description: 'Number of rooms allocated for this block' })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  rooms_allocated: number;

  @ApiProperty({ example: 150.00, description: 'Special price per night for this group (legacy, use rate_sun_wed/rate_thu_sat for variable pricing)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price_per_night: number;

  @ApiPropertyOptional({
    example: 'per_room',
    default: 'per_room',
    enum: ['per_room', 'per_person'],
    description: 'Price type: per_room (rate is for entire room) or per_person (rate multiplied by occupancy)'
  })
  @IsOptional()
  @IsIn(['per_room', 'per_person'])
  price_type?: 'per_room' | 'per_person';

  // Variable day-of-week pricing
  @ApiPropertyOptional({ example: 629.00, description: 'Rate for Sunday through Wednesday nights' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rate_sun_wed?: number;

  @ApiPropertyOptional({ example: 658.00, description: 'Rate for Thursday through Saturday nights' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rate_thu_sat?: number;

  @ApiPropertyOptional({ example: 2, default: 2, description: 'Number of adults included in base rate' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  base_occupancy?: number;

  // Extra person charges (per night)
  @ApiPropertyOptional({ example: 90.00, description: 'Extra charge per additional adult per night' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  extra_adult_per_night?: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Extra charge per child (4-12 years) per night. 0 = FREE' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  extra_child_per_night?: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Extra charge per teen (13-17 years) per night. 0 = FREE' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  extra_teen_per_night?: number;

  @ApiPropertyOptional({ example: 2, description: 'Minimum nights required for booking' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(30)
  min_nights?: number;

  @ApiPropertyOptional({ example: 7, description: 'Maximum nights allowed for booking' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  max_nights?: number;

  @ApiPropertyOptional({ example: true, default: true, description: 'Is this room block active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
