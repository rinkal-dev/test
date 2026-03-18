import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum GuestRefundType {
  FULL = 'full',
  PARTIAL = 'partial',
}

export class GuestRefundRequestDto {
  @ApiProperty({
    description: 'UUID of the booking to request refund for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  booking_uuid: string;

  @ApiProperty({
    description: 'Reason for requesting the refund',
    example: 'Unable to attend due to personal circumstances',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional notes or details',
    example: 'Family emergency, need to cancel trip',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GuestCancellationPreviewDto {
  @ApiProperty({
    description: 'UUID of the booking to preview cancellation for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  booking_uuid: string;
}
