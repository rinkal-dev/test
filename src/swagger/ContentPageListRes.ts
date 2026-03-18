import { ApiProperty } from '@nestjs/swagger';
import { ContentPageList } from './schema/ContentPageList';

export class ContentPageListRes {
  @ApiProperty()
  message: string;

  @ApiProperty({
    type: ContentPageList,
  })
  data: ContentPageList;
}
