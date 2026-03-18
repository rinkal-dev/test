import { ApiProperty } from '@nestjs/swagger';
import { Message } from './schema/Message';

export class UpdateMobileResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;
}
