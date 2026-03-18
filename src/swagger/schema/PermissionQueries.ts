import { ApiProperty } from '@nestjs/swagger';
import { queries } from '../Base';
import { IsEnum, IsNumberString } from 'class-validator';

export class PermissionQueries {
  @ApiProperty(queries.permission_field)
  @IsEnum(['name', 'created_at', 'updated_at'], {
    message: 'Sort Field should be name, created_at and updated_at.',
  })
  field: string;

  @ApiProperty(queries.common_sort)
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
