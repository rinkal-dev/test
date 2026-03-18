import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class ResetPasswordResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
