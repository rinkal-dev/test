import { ApiProperty } from '@nestjs/swagger';
import { SubAdminDetails } from './schema/SubAdminDetails';

export class SubAdminDetailsRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: SubAdminDetails })
  data: SubAdminDetails;
}
