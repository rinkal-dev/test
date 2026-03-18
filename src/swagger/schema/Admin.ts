import { ApiProperty } from '@nestjs/swagger';

export class Admin {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  mobile: string;

  @ApiProperty({ required: false, nullable: true })
  mobile_verified_at: string;

  @ApiProperty({ required: false, nullable: true })
  email_verified_at: string;
}
