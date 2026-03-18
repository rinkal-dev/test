import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { WeddingGroupStatus } from './CreateWeddingGroupDto';

export class WeddingGroupQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'Smith Wedding', description: 'Search by name, bride name, groom name, or booking link' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by hotel ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hotel_id?: number;

  @ApiPropertyOptional({ example: 'active', enum: WeddingGroupStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(WeddingGroupStatus)
  status?: WeddingGroupStatus;

  @ApiPropertyOptional({ example: 1, description: 'Filter by creator admin ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  created_by?: number;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Filter events starting from this date' })
  @IsOptional()
  @IsDateString()
  event_date_from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Filter events starting until this date' })
  @IsOptional()
  @IsDateString()
  event_date_to?: string;

  @ApiPropertyOptional({ example: 'event_start_date', default: 'created_at' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ example: 'ASC', default: 'DESC' })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
