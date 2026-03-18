import { ApiProperty } from '@nestjs/swagger';
import { CountryList } from './schema/CountryList';

export class CountriesListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: CountryList })
  data: CountryList;
}
