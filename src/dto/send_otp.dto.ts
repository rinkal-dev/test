import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  Matches,
  ValidateIf,
} from 'class-validator';

export enum VerificationTypes {
  EMAIL = 'email',
  MOBILE = 'mobile',
}

export class SendOTPDTO {
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
  @Matches(/^[0-9]{10}$/, { message: 'Mobile should be a length of 10 digit.' })
  mobile: string;
}
