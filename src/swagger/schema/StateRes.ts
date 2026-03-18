import { ApiProperty } from '@nestjs/swagger';
import { StateCountry } from './StateCountry';

export class StateRes {
  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: StateCountry })
  country: StateCountry;
}
