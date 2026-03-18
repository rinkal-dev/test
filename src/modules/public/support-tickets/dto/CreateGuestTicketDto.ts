import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateGuestTicketDto {
  @ApiProperty({ description: 'Guest name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  guest_name: string;

  @ApiProperty({ description: 'Guest email' })
  @IsEmail()
  @IsNotEmpty()
  guest_email: string;

  @ApiPropertyOptional({ description: 'Guest phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guest_phone?: string;

  @ApiProperty({ description: 'Ticket subject' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ description: 'Ticket message' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Booking reference (if applicable)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  booking_reference?: string;

  @ApiPropertyOptional({ description: 'Wedding group slug (if applicable)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wedding_slug?: string;
}
