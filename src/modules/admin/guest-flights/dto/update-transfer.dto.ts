import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTransferDto {
  @ApiPropertyOptional({
    description: 'Arrival transfer status',
    enum: ['pending', 'confirmed', 'not_needed', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'not_needed', 'cancelled'])
  arrival_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Departure transfer status',
    enum: ['pending', 'confirmed', 'not_needed', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'not_needed', 'cancelled'])
  departure_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Admin notes about the transfer' })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}
