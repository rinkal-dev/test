import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating a single setting
 */
export class UpdateSettingDto {
  @ApiProperty({
    description: 'Setting key (must be whitelisted)',
    example: 'MAIL_HOST',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({
    description: 'Setting value',
    example: 'smtp.gmail.com',
  })
  @IsString()
  @MaxLength(5000)
  value: string;
}

/**
 * DTO for bulk updating multiple settings
 */
export class BulkUpdateSettingsDto {
  @ApiProperty({
    description: 'Array of settings to update',
    type: [UpdateSettingDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingDto)
  settings: UpdateSettingDto[];
}

/**
 * DTO for category filter
 */
export class SettingsCategoryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'email',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
