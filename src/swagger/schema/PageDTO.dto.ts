import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsPositive,
  ValidateIf,
} from 'class-validator';
import { queries } from '../Base';

export class PageDTO {
  @ApiProperty(queries.limit)
  @IsPositive()
  @IsInt()
  @IsNotEmpty()
  // @ValidateIf((fields) => !fields.is_exportable)
  @Transform(({ value }) => (Number.isNaN(+value) ? value : +value))
  limit: number;

  @ApiProperty(queries.page)
  @IsPositive()
  @IsInt()
  @IsNotEmpty()
  // @ValidateIf((fields) => !fields.is_exportable) // We get is_exportable as pure boolean type
  @Transform(({ value }) => (Number.isNaN(+value) ? value : +value))
  page: number;

  // @ApiProperty({
  //   default: false,
  // })
  // @IsBoolean()
  // @IsNotEmpty()
  // @Transform(({ value }) => value === 'true')
  // is_exportable: boolean;
}
