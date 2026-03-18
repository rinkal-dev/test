import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Message } from './schema/Message';
import { Tokens } from './schema/Tokens';

export class RefreshTokenResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;

  @ApiProperty({
    allOf: [{ $ref: getSchemaPath(Tokens) }],
  })
  data: object;
}
