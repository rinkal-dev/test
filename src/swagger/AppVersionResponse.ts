import { ApiProperty } from '@nestjs/swagger';
import { AppVersion } from './schema/AppVersion';
import { Message } from './schema/Message';

export class AppVersionResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;

  @ApiProperty({
    type: AppVersion,
  })
  platform: object;
}
