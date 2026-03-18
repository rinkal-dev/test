import { ApiProperty } from '@nestjs/swagger';
import { ContentPageDetails } from './schema/ContentPageDetails';

export class ContentPageDetailsRes {
  @ApiProperty()
  message: string;

  @ApiProperty({
    type: ContentPageDetails,
  })
  data: ContentPageDetails;
}
