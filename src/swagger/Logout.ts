import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class LogoutResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
