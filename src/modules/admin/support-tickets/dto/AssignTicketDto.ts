import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AssignTicketDto {
  @ApiPropertyOptional({
    description: 'UUID of admin to assign the ticket to (null to unassign)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  assigned_to_uuid?: string | null;
}
