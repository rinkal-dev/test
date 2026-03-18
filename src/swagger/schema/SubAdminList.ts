import { ApiProperty } from '@nestjs/swagger';
import { PermissionRes } from './PermissionRes';

export class SubAdminList {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: 'boolean' })
  is_active: boolean;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiProperty({ type: PermissionRes, isArray: true })
  roles: PermissionRes[];
}
