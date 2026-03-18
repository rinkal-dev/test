import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class SendOTPResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
