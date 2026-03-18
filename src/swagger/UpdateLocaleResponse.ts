import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class UpdateLocaleResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
