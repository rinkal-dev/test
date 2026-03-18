import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'The message content',
    example: 'Thank you for reaching out. We are looking into this issue.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Whether this is an internal note (not visible to guest)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_internal?: boolean;
}
