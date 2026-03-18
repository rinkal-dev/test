import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { UserRes } from './schema/UserRes';

@ApiExtraModels(UserRes)
export class UserListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({
    type: UserRes,
  })
  data: UserRes;
}
