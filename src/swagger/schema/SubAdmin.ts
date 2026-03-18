import { ApiProperty } from '@nestjs/swagger';
import { SubAdminList } from './SubAdminList';
import { TotalCount } from './TotalCount';
export class SubAdmin {
  @ApiProperty({ type: 'integer' })
  total_count: number;

  @ApiProperty({ type: SubAdminList, isArray: true })
  sub_admins: SubAdminList;
}
