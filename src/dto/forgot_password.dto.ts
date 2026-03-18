import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
