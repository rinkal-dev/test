import { ApiProperty } from '@nestjs/swagger';

export class Platform {
  @ApiProperty()
  platform: string;

  @ApiProperty({ type: 'integer' })
  version: number;

  @ApiProperty()
  force_updatable: boolean;
}
