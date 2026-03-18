import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';
import { TicketPriority } from 'src/models/SupportTickets';

export class CreateTicketDto {
  @ApiPropertyOptional({ description: 'Wedding group UUID' })
  @IsOptional()
  @IsUUID()
  wedding_group_uuid?: string;

  @ApiPropertyOptional({ description: 'Booking UUID' })
  @IsOptional()
  @IsUUID()
  booking_uuid?: string;

  @ApiPropertyOptional({ description: 'Guest UUID (if registered guest)' })
  @IsOptional()
  @IsUUID()
  guest_uuid?: string;

  @ApiProperty({ description: 'Guest name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  guest_name: string;

  @ApiProperty({ description: 'Guest email' })
  @IsEmail()
  @MaxLength(255)
  guest_email: string;

  @ApiPropertyOptional({ description: 'Guest phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guest_phone?: string;

  @ApiProperty({ description: 'Ticket subject/reason' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  subject: string;

  @ApiProperty({ description: 'Ticket message' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Ticket priority', enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
