import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class VerifyOTPResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
