import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, ValidateIf } from 'class-validator';
import { queries } from '../Base';

export enum SortDirectionENUM {
  ASC = 'ASC',
  DESC = 'DESC',
  ASC_NUM = '1',
  DESC_NUM = '-1',
}

export class SortDTO {
  @ApiProperty(queries.users_field)
  @IsNotEmpty()
  @ValidateIf((o) => o.sort)
  field: string;

  @ApiProperty({
    enum: ['ASC', 'DESC', '1', '-1'],
  })
  @IsEnum(SortDirectionENUM)
  @IsNotEmpty()
  @ValidateIf((o) => o.field)
  sort: string;
}
