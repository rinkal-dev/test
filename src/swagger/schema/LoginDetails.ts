import { ApiProperty } from '@nestjs/swagger';

export class LoginDetails {
  @ApiProperty()
  access_token_expired_at: string;

  @ApiProperty({ required: false, nullable: true })
  last_used_at: string;

  @ApiProperty()
  device_name: string;

  @ApiProperty()
  device_type: string;

  @ApiProperty()
  status: string;
}
