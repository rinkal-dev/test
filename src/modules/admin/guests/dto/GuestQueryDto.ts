import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GuestQueryDto {
  @ApiPropertyOptional({ description: 'Filter by wedding group UUID' })
  @IsOptional()
  @IsUUID()
  wedding_group_uuid?: string;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'invited', 'booked', 'declined'],
  })
  @IsOptional()
  @IsEnum(['pending', 'invited', 'booked', 'declined'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by relationship',
    enum: ['family', 'friend', 'colleague', 'other'],
  })
  @IsOptional()
  @IsEnum(['family', 'friend', 'colleague', 'other'])
  relationship?: string;

  @ApiPropertyOptional({
    description: 'Filter by side',
    enum: ['bride', 'groom', 'mutual'],
  })
  @IsOptional()
  @IsEnum(['bride', 'groom', 'mutual'])
  side?: string;

  @ApiPropertyOptional({ description: 'Filter by invitation sent status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  invitation_sent?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;

  @ApiPropertyOptional({
    description: 'Sort field',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
