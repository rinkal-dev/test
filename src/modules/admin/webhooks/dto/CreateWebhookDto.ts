import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsArray,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Descriptive name for the webhook',
    example: 'N8N Production',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Webhook endpoint URL (must be HTTPS in production)',
    example: 'https://n8n.destapay.com/webhook/booking-events',
  })
  @IsUrl({ require_tld: false }) // Allow localhost for development
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Events to subscribe to (use * for all events)',
    example: ['booking.created', 'payment.succeeded'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    description: 'Whether the webhook is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Number of retry attempts on failure',
    default: 3,
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
    default: 5000,
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
