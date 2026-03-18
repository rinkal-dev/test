import { ApiProperty } from '@nestjs/swagger';

export class Countries {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  isd_code: string;

  @ApiProperty()
  currency_code: string;

  @ApiProperty()
  emoji: string;

  @ApiProperty({ type: 'boolean' })
  is_active: boolean;
}
