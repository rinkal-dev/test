import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateSubAdminDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9\s]+$/, {
    message: 'Sub admin name can only contain letters, numbers and spaces.',
  })
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @Length(5, 255)
  email: string;

  @ApiProperty({ type: 'integer', isArray: true })
  @IsNotEmpty()
  @IsArray()
  roles: number[];

  @ApiProperty({ type: 'boolean', enum: [true, false] })
  @IsNotEmpty()
  @IsEnum([true, false])
  is_active: boolean;

  password?: string;
}
