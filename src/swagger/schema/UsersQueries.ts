import { ApiProperty } from '@nestjs/swagger';
import { queries } from '../Base';
import { IsEnum, IsNumberString } from 'class-validator';

export class UsersQueries {
  @ApiProperty(queries.users_field)
  @IsEnum(['name', 'email', 'created_at', 'updated_at'], {
    message: 'Sort Field should be name, email, created_at and updated_at.',
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

  @ApiProperty(queries.name)
  name: string;

  @ApiProperty(queries.email)
  email: string;

  @ApiProperty(queries.is_active)
  is_active: boolean;

  @ApiProperty(queries.search)
  search: string;
}
