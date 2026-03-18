import { ApiProperty } from '@nestjs/swagger';
import { Countries } from './Countries';

export class CountryList {
  @ApiProperty({ type: 'integer' })
  total_count: number;

  @ApiProperty({ isArray: true, type: Countries })
  countries: Countries[];
}
