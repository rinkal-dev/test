import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FilterDTO } from './pagination/FilterDTO.dto';
import { PageDTO } from '../swagger/schema/PageDTO.dto';
import { SortDTO } from '../swagger/schema/SortDTO.dto';
import { queries } from 'src/swagger/Base';

export enum UserTableFieldsENUM {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  IS_ACTIVE = 'is_active',
  NAME = 'name',
  EMAIL = 'email',
}

export class FormFilterDTO extends FilterDTO {
  @ApiProperty({
    type: 'enum',
    enum: UserTableFieldsENUM,
  })
  @IsEnum(UserTableFieldsENUM)
  name: string;
}

export class UserListDto extends IntersectionType(SortDTO, PageDTO) {
  @ApiProperty({
    enum: UserTableFieldsENUM,
  })
  @IsEnum(UserTableFieldsENUM)
  field: string;

  @ApiProperty({ required: false })
  @ValidateNested({
    each: true,
  })
  @IsArray()
  @IsOptional()
  @Type(() => FormFilterDTO)
  // @Transform(
  //   ({ value }) => {
  //     if (Array.isArray(value)) {
  //       value = value.map((filter) => {
  //         let alias = 'name';
  //         if (filter.name === UserTableFieldsENUM.EMAIL) {
  //           alias = 'email';
  //         } else if (filter.name === UserTableFieldsENUM.CREATED_AT) {
  //           alias = 'created_at';
  //         } else if (filter.name === UserTableFieldsENUM.UPDATED_AT) {
  //           alias = 'updated_at';
  //         } else if (filter.name === UserTableFieldsENUM.IS_ACTIVE) {
  //           alias = 'is_active';
  //         }
  //         return {
  //           ...filter,
  //           alias,
  //         };
  //       });
  //     }
  //     return plainToInstance(FormFilterDTO, value);
  //   },
  //   {
  //     toClassOnly: true,
  //   },
  // )
  filters: FormFilterDTO[];

  @ApiProperty(queries.search)
  @IsString()
  @IsOptional()
  search: string;
}
