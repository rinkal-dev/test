import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export enum FILTER_OPERATIONS {
  IS = 'is',
  IN = 'in',
  NOT_IN = 'not_in',
  GREATER_THAN = 'gt',
  GREATER_THAN_E = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_E = 'lte',
  CONTAINS = 'contains',
  BETWEEN = 'between',
}

export class FilterDTO {
  @IsNotEmpty()
  name: string;

  @IsIn(['timestamp', 'unix_timestamp', 'text', 'number', 'boolean'])
  @IsNotEmpty()
  requested_field_type: string;

  @IsEnum(FILTER_OPERATIONS)
  @IsNotEmpty()
  operation: FILTER_OPERATIONS;

  @ArrayMinSize(1)
  @IsArray()
  @IsNotEmpty()
  values: string;
}
