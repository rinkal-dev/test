import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  Length,
  MaxLength,
  IsString,
  MinLength,
  Matches,
  maxLength,
  IsOptional,
  IsJSON,
  isEnum,
  IsEnum,
} from 'class-validator';

export enum SocialTypes {
  GOOGLE = 'Google',
  FACBOOK = 'Facebook',
  Twitter = 'Twitter',
  Apple = 'Apple',
}

export enum DeviceTypes {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class SocialLoginDTO {
  @ApiProperty()
  @IsNotEmpty()
  social_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsJSON()
  social_data: string;

  @ApiProperty({
    enum: SocialTypes,
  })
  @IsNotEmpty()
  @IsEnum(SocialTypes)
  social_type: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(255)
  device_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(DeviceTypes)
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
