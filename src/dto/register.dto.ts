import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  Length,
  MaxLength,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Platform } from 'src/modules/admin/admin-auth/dto/LoginDto';

export enum RoleEnum {
  SUB_ADMIN = 'sub_admin',
  ADMIN = 'admin',
}

export class RegisterDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  @MaxLength(255)
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(
    /^(?=.{8,})(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&?+*!=<>{},_:;~|`\/"\\\\\'()-]).*$/,
    {
      message:
        'Password should contains min. 8 characters, one digit, Special characters, Upper case & lower case letter.',
    },
  )
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  isd_code: string;

  @ApiProperty()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Mobile should be a length of 10 digit.' })
  mobile: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(255)
  device_name: string;

  @ApiProperty({ type: 'string', enum: ['ios', 'android', 'web'] })
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
