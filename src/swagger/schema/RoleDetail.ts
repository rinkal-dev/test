import { ApiProperty } from '@nestjs/swagger';
import { PermissionRes } from './PermissionRes';

export class RoleDetail {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ isArray: true, type: PermissionRes })
  permissions: PermissionRes;
}
