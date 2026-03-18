import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PermissionDetails } from './schema/PermissionDetails';

export class PermissionDetailsRes {
  @ApiProperty()
  message: string;

  @ApiProperty({
    allOf: [{ $ref: getSchemaPath(PermissionDetails) }],
  })
  data: object;
}
