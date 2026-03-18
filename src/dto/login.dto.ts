import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  Length,
  MaxLength,
  IsString,
  IsOptional,
} from 'class-validator';

export class UserLoginDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  @ApiProperty()
  password: string;

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
