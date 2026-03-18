import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export enum DateRangeType {
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  LAST_QUARTER = 'LAST_QUARTER',
  YTD = 'YTD',
  LAST_YEAR = 'LAST_YEAR',
  ALL_TIME = 'ALL_TIME',
  CUSTOM = 'CUSTOM',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Filter by wedding group UUID' })
  @IsOptional()
  @IsString()
  wedding_group_uuid?: string;

  @ApiPropertyOptional({ enum: DateRangeType, description: 'Date range type' })
  @IsOptional()
  @IsEnum(DateRangeType)
  date_range?: DateRangeType;

  @ApiPropertyOptional({ description: 'Custom start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Custom end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class HotelManifestQueryDto {
  @ApiPropertyOptional({ description: 'Wedding group UUID (required for manifest)' })
  @IsString()
  wedding_group_uuid: string;
}
