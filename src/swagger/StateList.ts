import { ApiProperty } from '@nestjs/swagger';
import { States } from './schema/States';

export class StateList {
  @ApiProperty({ type: 'integer' })
  total_count: number;

  @ApiProperty({ isArray: true, type: States })
  states: States;
}
