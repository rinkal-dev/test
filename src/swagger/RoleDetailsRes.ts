import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { RoleDetail } from './schema/RoleDetail';
import { RolePermission } from './schema/RolePermission';
import { PermissionRes } from './schema/PermissionRes';

@ApiExtraModels(RoleDetail, RolePermission)
export class RoleDetailsRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: RoleDetail })
  data: RoleDetail;
}
