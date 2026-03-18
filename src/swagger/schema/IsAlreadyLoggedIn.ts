import { ApiProperty } from '@nestjs/swagger';

export class IsAlreadyLoggedIn {
  @ApiProperty()
  is_already_logged_in: boolean;
}
