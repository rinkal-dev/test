import { ApiProperty } from '@nestjs/swagger';

export class Success {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: 'integer' })
  statusCode: number;

  @ApiProperty()
  message: string;
}
