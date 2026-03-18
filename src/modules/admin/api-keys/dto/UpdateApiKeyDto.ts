import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'Descriptive name for the API key',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Allowed permissions/scopes for this key',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Whether the API key is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Rate limit (requests per hour)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  rate_limit?: number;

  @ApiPropertyOptional({
    description: 'Expiration date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Optional description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
