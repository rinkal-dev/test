import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(5, 255, {
    message: 'Role name must be longer than or equal to 5 characters',
  })
  // @Matches(/r'^[-\w\s.]+$'/, {
  //   message: 'Role name contains only Characters.',
  // })
  name: string;

  @ApiProperty({ isArray: true, type: 'string' })
  @IsNotEmpty()
  @IsArray()
  permissions: string[];
}
