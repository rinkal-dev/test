import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Descriptive name for the API key',
    example: 'N8N Production',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Allowed permissions/scopes for this key',
    example: ['bookings:read', 'weddings:read', 'external:*'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({
    description: 'Rate limit (requests per hour)',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  rate_limit?: number;

  @ApiPropertyOptional({
    description: 'Expiration date (ISO format)',
    example: '2027-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Optional description of key purpose',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
