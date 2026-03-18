import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  Length,
  MaxLength,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
} from 'class-validator';

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  WINDOWS = 'Windows',
  MACOS = 'MacOS',
  LINUX = 'Linux',
}
export class LoginDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @Length(3, 255)
  email: string;

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

  @ApiProperty({ type: 'string', enum: ['ios', 'android', 'web', 'Windows', 'MacOS', 'Linux'] })
  @IsNotEmpty()
  @IsEnum(Platform, {
    message: 'Device type must be a valid enum value.',
  })
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
