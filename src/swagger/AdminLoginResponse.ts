import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsAlreadyLoggedIn } from './schema/IsAlreadyLoggedIn';
import { Message } from './schema/Message';
import { Tokens } from './schema/Tokens';
import { Admin } from './schema/Admin';

@ApiExtraModels(Admin, IsAlreadyLoggedIn, Tokens)
export class AdminLoginResponse {
  @ApiProperty({
    type: 'string',
  })
  message: Message;

  @ApiProperty({
    allOf: [
      {
        properties: {
          admin: {
            $ref: getSchemaPath(Admin),
          },
        },
      },
      { $ref: getSchemaPath(IsAlreadyLoggedIn) },
      { $ref: getSchemaPath(Tokens) },
    ],
  })
  data: object;
}
