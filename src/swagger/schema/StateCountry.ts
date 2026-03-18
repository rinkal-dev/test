import { ApiProperty } from '@nestjs/swagger';

export class StateCountry {
  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;
}
