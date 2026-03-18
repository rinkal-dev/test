import { ApiProperty } from '@nestjs/swagger';
import { StateCountry } from './StateCountry';

export class States {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ type: 'boolean' })
  is_active: boolean;

  @ApiProperty({ type: StateCountry })
  country: StateCountry;
}
