import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsNotEmpty,
  Length,
  ValidateIf,
} from 'class-validator';
import { mailConfig } from 'src/config/mail';
import { VerificationTypes } from './send_otp.dto';

export class VerifyOTPDTO {
  @ApiProperty({
    enum: VerificationTypes,
  })
  @IsNotEmpty()
  @IsEnum(VerificationTypes)
  verification_for: string;

  @ApiProperty()
  @ValidateIf((o) => o.verification_for === 'email')
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @ValidateIf((o) => o.verification_for === 'mobile')
  @IsNotEmpty()
  isd_code: string;

  @ApiProperty()
  @ValidateIf((o) => o.verification_for === 'mobile')
  @IsNotEmpty()
  @IsMobilePhone()
  mobile: string;

  @ApiProperty({
    type: 'integer',
    format: 'int32',
  })
  @IsNotEmpty()
  @Length(mailConfig.otpLength, mailConfig.otpLength)
  otp: number;
}
