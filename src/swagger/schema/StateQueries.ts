import { ApiProperty } from '@nestjs/swagger';
import { queries } from '../Base';
import { IsEnum, IsNumberString } from 'class-validator';

export class StateQueries {
  @ApiProperty(queries.states_field)
  @IsEnum(['name', 'code', 'country'], {
    message: 'Sort Field should be name, code and country.',
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
