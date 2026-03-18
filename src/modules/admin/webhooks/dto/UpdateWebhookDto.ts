import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsArray,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

export class UpdateWebhookDto {
  @ApiPropertyOptional({
    description: 'Descriptive name for the webhook',
    example: 'N8N Production',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Webhook endpoint URL',
    example: 'https://n8n.destapay.com/webhook/booking-events',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiPropertyOptional({
    description: 'Events to subscribe to',
    example: ['booking.created', 'payment.succeeded'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({
    description: 'Whether the webhook is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Number of retry attempts on failure',
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retry_count?: number;

  @ApiPropertyOptional({
    description: 'Request timeout in milliseconds',
    minimum: 1000,
    maximum: 30000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeout_ms?: number;

  @ApiPropertyOptional({
    description: 'Optional description of webhook purpose',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
