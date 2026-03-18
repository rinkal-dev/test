import { ApiProperty } from '@nestjs/swagger';
import { Platform } from './Platform';

export class AppVersions {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  key: string;

  @ApiProperty({ isArray: true, type: Platform })
  values: Platform[];
}
