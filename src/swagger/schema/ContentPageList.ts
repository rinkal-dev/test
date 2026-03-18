import { ApiProperty } from '@nestjs/swagger';
import { ContentPageListDetail } from './ContentPageListDetail';

export class ContentPageList {
  @ApiProperty({ type: 'integer' })
  total_count: number;

  @ApiProperty({ type: ContentPageListDetail, isArray: true })
  content_pages: ContentPageListDetail[];
}
