import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class SendRoommateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  recipient_booking_uuid: string;

  @IsString()
  @IsNotEmpty({ message: 'Please enter a message' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  message: string;
}
