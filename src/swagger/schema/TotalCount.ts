import { ApiProperty } from '@nestjs/swagger';

export class TotalCount {
  @ApiProperty({ type: 'integer' })
  total_count: number;
}
