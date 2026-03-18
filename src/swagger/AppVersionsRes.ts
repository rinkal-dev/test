import { ApiProperty } from '@nestjs/swagger';
import { AppVersions } from './schema/AppVersions';

export class AppVersionsRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: AppVersions })
  data: AppVersions;
}
