import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { mailConfig } from 'src/config/mail';

export class ResetPasswordDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(mailConfig.otpLength, mailConfig.otpLength)
  token: string;

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
}
