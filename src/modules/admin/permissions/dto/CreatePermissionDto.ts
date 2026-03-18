import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(5, 255, {
    message: 'Permission name must be longer than or equal to 5 characters',
  })
  // @Matches(/^[a-zA-Z\s\-\.]+$/, {
  //   message: 'Permission name contains only Characters.',
  // })
  name: string;
}
// /^[a-zA-Z\s]+$/
