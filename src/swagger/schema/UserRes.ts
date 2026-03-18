import { ApiProperty } from '@nestjs/swagger';
import { UserListDetail } from './UserListDetail';

export class UserRes {
  @ApiProperty({ type: 'integer' })
  total_count: number;

  @ApiProperty({ type: UserListDetail, isArray: true })
  users: UserListDetail[];
}
