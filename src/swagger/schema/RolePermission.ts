import { ApiProperty } from '@nestjs/swagger';
import { PermissionRes } from './PermissionRes';

export class RolePermission {
  @ApiProperty({ isArray: true })
  permissions: PermissionRes;
}
