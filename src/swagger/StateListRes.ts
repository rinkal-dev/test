import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { States } from './schema/States';
import { StateList } from './StateList';

@ApiExtraModels(States)
export class StateListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({
    type: StateList,
  })
  data: StateList;
}
