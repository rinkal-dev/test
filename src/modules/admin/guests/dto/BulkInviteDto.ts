import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class BulkInviteDto {
  @ApiProperty({
    description: 'Array of guest UUIDs to send invitations to',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  guest_uuids: string[];

  @ApiPropertyOptional({
    description: 'Custom message to include in invitation (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  custom_message?: string;
}

export class SendInvitationDto {
  @ApiPropertyOptional({
    description: 'Custom message to include in invitation (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  custom_message?: string;
}
