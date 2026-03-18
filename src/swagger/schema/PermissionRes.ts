import { ApiProperty } from '@nestjs/swagger';

export class PermissionRes {
  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;
}
