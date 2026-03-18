import { ApiProperty } from '@nestjs/swagger';
import { SubAdmin } from './schema/SubAdmin';

export class SubAdminListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({
    type: SubAdmin,
  })
  data: SubAdmin;
}
