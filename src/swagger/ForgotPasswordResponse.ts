import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class ForgotPasswordResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
