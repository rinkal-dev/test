import { ApiProperty } from '@nestjs/swagger';
import { queries } from '../Base';
import { IsEnum, IsNumberString } from 'class-validator';

export class CountriesQueries {
  @ApiProperty(queries.countries_field)
  @IsEnum(['name', 'code', 'isd_code', 'currency_code'], {
    message: 'Sort Field should be name, code, isd_code and currency_code.',
  })
  field: string;

  @ApiProperty(queries.countries_sort)
  @IsEnum(['ASC', 'DESC', '1', '-1'], {
    message: 'Sort Field should be ASC, DESC, 1 or -1.',
  })
  sort: string;

  @ApiProperty(queries.limit)
  @IsNumberString()
  limit: number;

  @ApiProperty(queries.page)
  @IsNumberString()
  page: number;

  @ApiProperty(queries.search)
  search: string;
}
