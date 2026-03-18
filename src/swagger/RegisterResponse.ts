import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsAlreadyLoggedIn } from './schema/IsAlreadyLoggedIn';
import { Message } from './schema/Message';
import { Tokens } from './schema/Tokens';
import { User } from './schema/User';

@ApiExtraModels(User, IsAlreadyLoggedIn, Tokens)
export class RegisterResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;

  @ApiProperty({
    allOf: [
      {
        properties: {
          user: {
            $ref: getSchemaPath(User),
          },
        },
      },
      { $ref: getSchemaPath(Tokens) },
    ],
  })
  data: object;
}
