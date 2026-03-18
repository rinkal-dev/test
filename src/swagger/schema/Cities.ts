import { ApiProperty } from '@nestjs/swagger';
import { StateRes } from './StateRes';

export class Cities {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  is_active: number;

  @ApiProperty()
  state: StateRes;
}
