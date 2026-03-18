import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class UpdateEmailResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
