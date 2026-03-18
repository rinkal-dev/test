import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class RefreshDTO {
  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(255)
  device_name: string;

  @ApiProperty({ enum: ['ios', 'android', 'web'] })
  @IsNotEmpty()
  device_type: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(255)
  device_id: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @MaxLength(255)
  device_token: string;
}
