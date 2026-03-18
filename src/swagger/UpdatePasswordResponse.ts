import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class UpdatePasswordResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
