import { ApiProperty } from '@nestjs/swagger';

export class ContentPageListDetail {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ type: 'boolean' })
  is_active: boolean;

  @ApiProperty()
  updated_at: string;
}
