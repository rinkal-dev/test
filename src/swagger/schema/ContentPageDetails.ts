import { ApiProperty } from '@nestjs/swagger';

export class ContentPageDetails {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ required: false, nullable: true })
  updated_at: string;
}
