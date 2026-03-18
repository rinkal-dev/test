import { ApiProperty } from '@nestjs/swagger';
import { LoginDetails } from './LoginDetails';

export class UserDetails {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: 'boolean' })
  is_active: boolean;

  @ApiProperty({ required: false, nullable: true })
  isd_code: string;

  @ApiProperty({ required: false, nullable: true })
  mobile: string;

  @ApiProperty({ required: false, nullable: true })
  email_verified_at: string;

  @ApiProperty({ required: false, nullable: true })
  mobile_verified_at: string;

  @ApiProperty({ required: false, nullable: true })
  profile_photo: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ isArray: true, type: LoginDetails })
  login_details: LoginDetails;
}
