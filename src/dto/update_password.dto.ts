import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, MinLength } from 'class-validator';

export class UpdatePasswordDTO {
  @ApiProperty()
  @IsNotEmpty()
  password: string;

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
  new_password: string;
}
