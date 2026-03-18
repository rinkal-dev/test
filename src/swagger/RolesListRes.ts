import { ApiProperty } from '@nestjs/swagger';
import { RolesList } from './RolesList';

export class RolesListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: RolesList })
  data: RolesList;
}
