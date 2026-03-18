/**
 * DTO for updating roommate opt-in status
 * Solo Traveler Connection feature
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoommateOptInDto {
  @ApiProperty({
    description: 'Opt-in to solo traveler connection',
    example: true,
  })
  @IsBoolean()
  roommate_opt_in: boolean;

  @ApiPropertyOptional({
    description: 'Optional note for roommate matching preferences',
    example: 'Looking for someone to share a room and split costs',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Roommate note must not exceed 500 characters' })
  roommate_note?: string;
}
