import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class PastLogoutResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
