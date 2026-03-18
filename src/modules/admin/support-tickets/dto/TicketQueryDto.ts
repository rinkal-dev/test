import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus, TicketPriority } from 'src/models/SupportTickets';

/**
 * Filter type for ticket queries
 * - all: All tickets accessible to the user (my groups + assigned to me)
 * - my_groups: Only tickets from wedding groups created by me
 * - assigned_to_me: Only tickets assigned to me
 */
export enum TicketFilterType {
  ALL = 'all',
  MY_GROUPS = 'my_groups',
  ASSIGNED_TO_ME = 'assigned_to_me',
}

export class TicketQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by status', enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ description: 'Filter by priority', enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Filter by wedding group UUID' })
  @IsOptional()
  @IsUUID()
  wedding_group_uuid?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned admin UUID' })
  @IsOptional()
  @IsUUID()
  assigned_to_uuid?: string;

  @ApiPropertyOptional({ description: 'Search in guest name, email, subject' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'created_at' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Filter type: all (my groups + assigned), my_groups, assigned_to_me',
    enum: TicketFilterType,
    default: TicketFilterType.ALL,
  })
  @IsOptional()
  @IsEnum(TicketFilterType)
  filter_type?: TicketFilterType = TicketFilterType.ALL;
}
