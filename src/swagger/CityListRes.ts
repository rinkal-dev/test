import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Cities } from './schema/Cities';

@ApiExtraModels(Cities)
export class CityListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({
    isArray: true,
    type: Cities,
  })
  data: Cities[];
}
