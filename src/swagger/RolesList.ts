import { ApiProperty } from '@nestjs/swagger';
import { PermissionDetails } from './schema/PermissionDetails';

export class RolesList {
  @ApiProperty({ type: 'integer' })
  total_count: number;

  @ApiProperty({ isArray: true, type: PermissionDetails })
  roles: PermissionDetails[];
}
