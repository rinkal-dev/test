import { ApiProperty } from '@nestjs/swagger';

export class PermissionDetails {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ nullable: true, required: false })
  updated_at: string;
}
