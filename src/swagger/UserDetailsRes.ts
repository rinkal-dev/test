import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { UserDetails } from './schema/UserDetails';
import { LoginDetails } from './schema/LoginDetails';

@ApiExtraModels(UserDetails, LoginDetails)
export class UserDetailsRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: UserDetails })
  data: UserDetails;
}
