import { ApiProperty } from '@nestjs/swagger';
import { PermissionsList } from './PermissionsList';

export class PermissionListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: PermissionsList })
  data: PermissionsList;
}
