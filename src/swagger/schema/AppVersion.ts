import { ApiProperty } from '@nestjs/swagger';

export class AppVersion {
  @ApiProperty()
  message: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  force_updateable: boolean;
}
