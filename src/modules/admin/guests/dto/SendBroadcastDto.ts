import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum BroadcastChannel {
  EMAIL = 'email',
  SMS = 'sms',
}

export enum BroadcastAudience {
  ALL = 'ALL',           // All guests (invited & booked)
  BOOKED = 'BOOKED',     // Confirmed bookings only
  UNPAID = 'UNPAID',     // Pending final payment
  INVITED = 'INVITED',   // Invited but not booked yet
}

export class SendBroadcastDto {
  @ApiProperty({
    description: 'Communication channel',
    enum: BroadcastChannel,
    example: BroadcastChannel.EMAIL,
  })
  @IsEnum(BroadcastChannel)
  @IsNotEmpty()
  channel: BroadcastChannel;

  @ApiProperty({
    description: 'Target audience',
    enum: BroadcastAudience,
    example: BroadcastAudience.ALL,
  })
  @IsEnum(BroadcastAudience)
  @IsNotEmpty()
  audience: BroadcastAudience;

  @ApiProperty({
    description: 'Subject line (required for email, max 150 characters)',
    example: 'Important Update: Shuttle Schedule',
  })
  @IsString()
  @IsOptional()
  @MaxLength(150, { message: 'Subject must not exceed 150 characters' })
  subject?: string;

  @ApiProperty({
    description: 'Message content (max 2000 characters)',
    example: 'Hello guests, we wanted to inform you about the updated shuttle schedule...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Message must not exceed 2000 characters' })
  message: string;
}
