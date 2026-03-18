import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TicketStatus, TicketPriority } from 'src/models/SupportTickets';

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Ticket status', enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ description: 'Ticket priority', enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Assigned admin UUID' })
  @IsOptional()
  @IsUUID()
  assigned_to_uuid?: string;

  @ApiPropertyOptional({ description: 'Updated subject' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;
}
