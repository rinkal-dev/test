import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ContentPages {
  PRIVACT_POLICY = 'privacy-policy',
  TERMS_CONDITION = 'terms-conditions',
  ABOUT_US = 'about-us',
}

export class ContentPageDTO {
  @ApiProperty({
    description: 'Slug of a page that you expect in response.',
    enum: ContentPages,
  })
  @IsEnum(ContentPages)
  @IsNotEmpty()
  slug: string;
}
