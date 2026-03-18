import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ChangeStatus {
  @ApiProperty({ type: 'integer', enum: [0, 1], default: 1 })
  @IsNotEmpty()
  status: number;
}
